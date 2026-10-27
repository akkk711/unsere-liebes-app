'use client';

import { useState, useEffect, useRef } from 'react';

import { supabase } from '@/lib/supabase';

// Eure Erinnerungs-Sammlung
const REMINDERS = [
  "Denk daran, heute genug Wasser zu trinken! 💧",
  "Gönn dir eine kurze Pause und atme tief durch! 🧘‍♀️",
  "Schick deinem Schatz einen kurzen Gruß! 🥰",
  "Vergiss nicht, dich zwischendurch mal zu strecken! 🤸‍♂️",
  "Iss heute etwas Leckeres und Gesundes! 🥗",
  "Lächle einmal kurz – du machst das toll heute! ✨",
  "Nimm dir 5 Minuten Auszeit nur für dich! ☕",
  "Rücken gerade machen und Schultern entspannen! 💆‍♂️"
];

// Wechselt alle 4 Stunden automatisch die Erinnerung
const getReminder = () => {
  const fourHoursInMs = 1000 * 60 * 60 * 4;
  const currentInterval = Math.floor(Date.now() / fourHoursInMs);
  return REMINDERS[currentInterval % REMINDERS.length];
};

export default function Home() {
  // --- AUTH & PROFILE STATE ---
  const [session, setSession] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ display_name: string } | null>(null);

  // --- PUSH NOTIFICATION SUBSCRIBE LOGIC ---
const [pushSubscribed, setPushSubscribed] = useState(false);

// --- BENACHRICHTIGUNG POPUP STATE & DIRECT LISTENER ---
  const [notificationModal, setNotificationModal] = useState<{ title: string; body: string; type?: string } | null>(null);

  const checkQueryParams = () => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const notifTitle = params.get('notifTitle');
    const notifBody = params.get('notifBody');
    const notifType = params.get('notifType');

    if (notifTitle || notifBody) {
      setNotificationModal({
        title: decodeURIComponent(notifTitle || 'Neue Nachricht ❤️'),
        body: decodeURIComponent(notifBody || ''),
        type: decodeURIComponent(notifType || 'general')
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  useEffect(() => {
    checkQueryParams();

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
        setNotificationModal({
          title: event.data.notifTitle || 'Neue Nachricht ❤️',
          body: event.data.notifBody || '',
          type: event.data.notifType || 'general'
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkQueryParams();
      }
    };

    if (typeof window !== 'undefined' && 'navigator' in window && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (typeof window !== 'undefined' && 'navigator' in window && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(async (registration) => {
        // Prüfen, ob für dieses Gerät/Browser bereits ein aktives Push-Abo existiert
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          setPushSubscribed(true);
        }
      }).catch(err => console.log('SW Registration error:', err));
    }
  }, []);

const subscribeToPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Push-Benachrichtigungen werden von diesem Browser leider nicht unterstützt.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      alert('Berechtigung für Benachrichtigungen wurde abgelehnt.');
      return;
    }

    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) {
      alert('VAPID Public Key fehlt.');
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicVapidKey
    });

    // In Supabase speichern
    if (session?.user) {
      // Alte Einträge für diesen User löschen, damit keine Duplikate entstehen
      await supabase.from('push_subscriptions').delete().eq('user_id', session.user.id);

      await supabase.from('push_subscriptions').insert([{
        user_id: session.user.id,
        subscription: subscription
      }]);
      setPushSubscribed(true);
      alert('🔔 Benachrichtigungen erfolgreich aktiviert!');
    }
  } catch (err: any) {
    console.error(err);
    alert(`Fehler beim Aktivieren: ${err.message}`);
  }
};

  const [activeTab, setActiveTab] = useState<'home' | 'malen' | 'ziele' | 'galerie'>('home');
  
  // --- ZEIT & JAHRESTAG ---
  const startDate = new Date('2026-08-20T00:00:00'); // Euer Beziehungsstart
  const [timeTogether, setTimeTogether] = useState({ days: 57, hours: 0, minutes: 0, seconds: 0 });
  const [daysToNextAnniversary, setDaysToNextAnniversary] = useState(308);

  // --- AUTH SESSION PROFIEL CHECK ---
  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setCurrentUserProfile(data);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setCurrentUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });

      if (error) {
        alert(`Registrierung fehlgeschlagen: ${error.message}`);
        return;
      }

      if (data.user) {
        const nameToSave = authDisplayName.trim() || 'Partner';
        await supabase.from('profiles').insert([{ id: data.user.id, display_name: nameToSave }]);
        setCurrentUserProfile({ display_name: nameToSave });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (error) {
        alert(`Login fehlgeschlagen: ${error.message}`);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diffMs = now.getTime() - startDate.getTime();
      
      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      setTimeTogether({ days: Math.abs(days), hours, minutes, seconds });

      let nextAnniv = new Date(now.getFullYear(), 7, 20); // 20. August
      if (now > nextAnniv) {
        nextAnniv.setFullYear(now.getFullYear() + 1);
      }
      const daysLeft = Math.ceil((nextAnniv.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      setDaysToNextAnniversary(daysLeft);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, []);


 // --- MOOD TRACKER & PUSH ---
 const [selectedMood, setSelectedMood] = useState<string>('😊');

  const handleMoodSelect = async (emoji: string) => {
    setSelectedMood(emoji);
    const author = currentUserProfile?.display_name || 'Liebling';

    let moodText = `${author} fühlt sich gerade ${emoji}`;
    if (emoji === '😊') moodText = `${author} ist gerade super gut drauf! 😊`;
    if (emoji === '🥰') moodText = `${author} schickt dir ganz viel Liebe! 🥰`;
    if (emoji === '🥱') moodText = `${author} ist gerade ziemlich müde... 🥱`;
    if (emoji === '😢') moodText = `${author} ist gerade traurig, schick eine Umarmung! 😢`;

    try {
      await supabase.from('moods').insert([{ mood_emoji: emoji, user_name: author }]);
    } catch (e) {
      console.log('Mood gesichert');
    }

    // Push-Benachrichtigung an den Partner schicken
    fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Stimmung von ${author} ${emoji}`,
        body: moodText,
        senderUserId: session?.user?.id,
        type: 'mood'
      })
    }).catch(err => console.log('Push Fehler:', err));

    // ✨ BESTÄTIGUNGS-TOAST ANZEIGEN:
    setToastMessage(`Stimmung ${emoji} gesendet! ❤️`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // --- UMARMUNG / ANTWORT ZURÜCKSENDEN ---
  const sendReplyNotification = async () => {
    const author = currentUserProfile?.display_name || 'Liebling';

    fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Liebesgruss von ${author}! 🫂❤️`,
        body: `${author} schickt dir eine feste Umarmung & ganz viel Liebe zurück!`,
        senderUserId: session?.user?.id,
        type: 'general'
      })
    }).catch(err => console.log('Push Fehler:', err));

    setNotificationModal(null);
    setToastMessage('🫂 Umarmung wurde gesendet! ❤️');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // --- MALEN & KAMERA (CANVAS + PHOTO) ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#6C5CE7');
  const [brushSize, setBrushSize] = useState(4);
  const [drawingCaption, setDrawingCaption] = useState('');
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('🎨 Kunstwerk in Galerie gespeichert! ❤️');

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawingCaption('');
  };

  // 📸 FOTO VOM HANDY AUFNEHMEN & KOMPRIMIEREN (DIESE FUNKTION HAT GEFEHLT)
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const offCanvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }

        offCanvas.width = width;
        offCanvas.height = height;
        const ctx = offCanvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = offCanvas.toDataURL('image/jpeg', 0.8);
        setPhotoPreview(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // --- ZEICHNUNG SPEICHERN ---
  const saveDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const author = currentUserProfile?.display_name || 'Partner';

    try {
      const { data } = await supabase
        .from('drawings')
        .insert([{ image_url: dataUrl, caption: drawingCaption, author_name: author, is_favorite: false }])
        .select();

      if (data && data.length > 0) {
        setGalleryImages((prev) => [data[0], ...prev]);
      } else {
        setGalleryImages((prev) => [{ id: Date.now().toString(), image_url: dataUrl, caption: drawingCaption, author_name: author, is_favorite: false }, ...prev]);
      }

      // 🔔 PUSH-BENACHRICHTIGUNG AN PARTNER SENDEN
      fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `🎨 Neue Zeichnung von ${author}!`,
          body: drawingCaption ? `"${drawingCaption}"` : 'Schau dir das neue Bild in eurer Galerie an ❤️',
          senderUserId: session?.user?.id
        })
      }).catch(err => console.log('Push Fehler:', err));

    } catch (e) {
      setGalleryImages((prev) => [{ id: Date.now().toString(), image_url: dataUrl, caption: drawingCaption, author_name: author, is_favorite: false }, ...prev]);
    }

    clearCanvas();
    setToastMessage('🎨 Kunstwerk in Galerie gespeichert! ❤️');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // --- FOTO SPEICHERN ---
  const savePhoto = async () => {
    if (!photoPreview) return;
    const author = currentUserProfile?.display_name || 'Partner';

    try {
      const { data } = await supabase
        .from('drawings')
        .insert([{ image_url: photoPreview, caption: photoCaption, author_name: author, is_favorite: false }])
        .select();

      if (data && data.length > 0) {
        setGalleryImages((prev) => [data[0], ...prev]);
      } else {
        setGalleryImages((prev) => [{ id: Date.now().toString(), image_url: photoPreview, caption: photoCaption, author_name: author, is_favorite: false }, ...prev]);
      }

      // 🔔 PUSH-BENACHRICHTIGUNG AN PARTNER SENDEN
      fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `📸 Neues Foto von ${author}!`,
          body: photoCaption ? `"${photoCaption}"` : 'Schau dir das neue Foto in eurer Galerie an ❤️',
          senderUserId: session?.user?.id
        })
      }).catch(err => console.log('Push Fehler:', err));

    } catch (err) {
      console.error(err);
    }

    setPhotoPreview(null);
    setPhotoCaption('');
    setToastMessage('📸 Foto in Galerie gespeichert! ❤️');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

 // --- BUCKETLIST / ZIELE LOGIK ---
  const [bucketList, setBucketList] = useState<any[]>([]);
  const [newBucketTitle, setNewBucketTitle] = useState('');

  // 1. Ziele aus Supabase laden
  const fetchGoals = async () => {
    const { data, error } = await supabase
      .from('bucket_list')
      .select('*')
      .order('created_at', { ascending: true });

    if (data && !error) {
      setBucketList(data);
    }
  };

  // 2. Neues Ziel speichern (in Supabase & lokal anhängen)
  const handleAddBucketItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketTitle.trim()) return;

    const titleToSend = newBucketTitle.trim();
    setNewBucketTitle(''); // Input-Feld sofort zurücksetzen

    const { data, error } = await supabase
      .from('bucket_list')
      .insert([{
        title: titleToSend,
        is_completed: false,
        user_id: session?.user?.id
      }])
      .select();

    if (error) {
      console.error('Fehler beim Speichern:', error);
      alert(`Fehler beim Speichern: ${error.message}`); // Zeigt jetzt den exakten Grund an!
      return;
    }

    if (data && data[0]) {
      // WICHTIG: Neues Element an die bestehende Liste anhängen (...)
      setBucketList((prev) => [...prev, data[0]]);
    }
  };

  // 3. Status umschalten (Abhaken)
  const handleToggleBucketItem = async (id: string, currentStatus: boolean) => {
    setBucketList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_completed: !currentStatus } : item
      )
    );

    await supabase
      .from('bucket_list')
      .update({ is_completed: !currentStatus })
      .eq('id', id);
  };

  // --- GALERIE & MODAL ---
  const [galleryImages, setGalleryImages] = useState<{ id: string | number; image_url: string; caption?: string; author_name?: string; is_favorite?: boolean }[]>([]);
  const [selectedImageModal, setSelectedImageModal] = useState<{ id: string | number; image_url: string; caption?: string; author_name?: string } | null>(null);

  const fetchGallery = async () => {
    const { data } = await supabase.from('drawings').select('*').order('created_at', { ascending: false });
    if (data) setGalleryImages(data);
  };

  const toggleFavorite = async (id: string | number, currentFav?: boolean) => {
    const nextFav = !currentFav;
    setGalleryImages((prev) =>
      prev.map((img) => (String(img.id) === String(id) ? { ...img, is_favorite: nextFav } : img))
    );

    try {
      await supabase.from('drawings').update({ is_favorite: nextFav }).eq('id', id);
    } catch (e) {}
  };

  const deleteDrawing = async (id: string | number) => {
    setGalleryImages((prev) => prev.filter((img) => String(img.id) !== String(id)));

    try {
      await supabase.from('drawings').delete().eq('id', id);
    } catch (e) {}
  };

  useEffect(() => {
    if (activeTab === 'ziele') fetchGoals();
    if (activeTab === 'galerie') fetchGallery();
  }, [activeTab]);

  // --- ANMELDE-BILDSCHIRM (FALLS NICHT EINGELOGGT) ---
  if (!session) {
    return (
      <div className="app-viewport" style={{ justifyContent: 'center' }}>
        <div className="white-card" style={{ width: '100%', maxWidth: '360px', padding: '24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '22px', color: '#4A3E6D', fontWeight: '800', marginBottom: '8px' }}>
            Unsere Liebes-App ❤️
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>
            {isRegistering ? 'Erstelle euer persönliches Profil' : 'Melde dich an, um eure App zu öffnen'}
          </p>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isRegistering && (
              <input
                type="text"
                placeholder="Dein Vorname (z. B. Anna)"
                value={authDisplayName}
                onChange={(e) => setAuthDisplayName(e.target.value)}
                required
                style={{ padding: '12px', borderRadius: '12px', border: '1px solid #DDD6FE', outline: 'none' }}
              />
            )}
            <input
              type="email"
              placeholder="E-Mail Adresse"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              required
              style={{ padding: '12px', borderRadius: '12px', border: '1px solid #DDD6FE', outline: 'none' }}
            />
            <input
              type="password"
              placeholder="Passwort"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
              style={{ padding: '12px', borderRadius: '12px', border: '1px solid #DDD6FE', outline: 'none' }}
            />

            <button
              type="submit"
              style={{
                padding: '12px',
                background: 'linear-gradient(135deg, #B197FC, #E599F7)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '15px',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              {isRegistering ? 'Konto erstellen ✨' : 'Einloggen ❤️'}
            </button>
          </form>

          <button
            onClick={() => setIsRegistering(!isRegistering)}
            style={{ background: 'none', border: 'none', color: '#6C5CE7', fontSize: '13px', marginTop: '16px', fontWeight: '600', cursor: 'pointer' }}
          >
            {isRegistering ? 'Bereits ein Konto? Hier einloggen' : 'Noch kein Konto? Hier registrieren'}
          </button>
        </div>
      </div>
    );
  }

  // --- HAUPT-APP (EINGELOGGT) ---
  return (
    <div className="app-viewport">

      {/* ================= TAB 1: HOME ================= */}
      {activeTab === 'home' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* User Bar */}
          <div style={{ width: '100%', maxWidth: '390px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#4A3E6D' }}>
              Hallo, {currentUserProfile?.display_name || 'Liebling'} 👋
            </span>
  <div style={{ display: 'flex', gap: '8px' }}>
    <button
      onClick={subscribeToPush}
      style={{
        background: pushSubscribed ? '#E2E8F0' : '#DDD6FE',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '700',
        color: '#4A3E6D',
        cursor: 'pointer'
      }}
    >
      {pushSubscribed ? '🔔 Aktiv' : '🔔 Push an'}
    </button>
    <button
      onClick={handleLogout}
      style={{ background: '#F1F5F9', border: 'none', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: '#64748B', cursor: 'pointer' }}
    >
      Abmelden
    </button>
  </div>
</div>

          {/* Mood Bar */}
          <p className="section-title">DEINE STIMMUNG HEUTE</p>
          <div className="mood-card">
            {['😊', '🥰', '🥱', '😢'].map((emoji) => (
              <button
                key={emoji}
                className={`mood-btn ${selectedMood === emoji ? 'selected' : ''}`}
                onClick={() => handleMoodSelect(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Unsere Reise Card */}
          <div className="white-card" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '20px', color: '#4A3E6D', fontWeight: '800', margin: '0 0 16px 0' }}>
              Unsere Reise
            </h2>
            <p className="section-title">WIR LIEBEN UNS SEIT</p>
            <h1 style={{ fontSize: '64px', color: '#5B4699', fontWeight: '900', margin: '4px 0' }}>
              {timeTogether.days}
            </h1>
            <p style={{ fontSize: '13px', color: '#8E8A9F', fontWeight: '800', letterSpacing: '1px', marginBottom: '20px' }}>
              TAGEN
            </p>
          
            <div className="pink-gradient-banner">
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Nächster Jahrestag in</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '800' }}>
                {daysToNextAnniversary} Tagen ❤️
              </p>
            </div>
          </div>

          {/* Liebevolle Erinnerung Card */}
          <div className="white-card" style={{ position: 'relative', textAlign: 'center' }}>
            <span style={{ position: 'absolute', left: '20px', top: '18px', fontSize: '24px' }}>
              🔔
            </span>
            <h2 style={{ fontSize: '18px', color: '#4A3E6D', fontWeight: '800', margin: 0, textAlign: 'center' }}>
              Erinnerung für dich
            </h2>
            <p style={{ textAlign: 'center', color: '#475569', fontWeight: '600', fontSize: '15px', marginTop: '12px', marginBottom: 0 }}>
              {getReminder()}
            </p>
          </div>
        </div>
      )}

      {/* ================= TAB 2: MESSAGE (MALEN & KAMERA) ================= */}
      {activeTab === 'malen' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p className="section-title">ETWAS FÜR DICH MALEN ODER SPRECHEN</p>
          
          <div className="white-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {!photoPreview ? (
              <>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handlePhotoCapture}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '16px',
                    background: '#FAF9FE',
                    border: '2px dashed #B197FC',
                    borderRadius: '16px',
                    fontWeight: '800',
                    color: '#6C5CE7',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  📸 Foto mit Kamera knipsen
                </button>
              </>
            ) : (
              <div style={{ width: '100%', marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img
                  src={photoPreview}
                  alt="Vorschau"
                  style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '16px', marginBottom: '12px' }}
                />
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Nachricht / Bildunterschrift..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #DDD6FE',
                    outline: 'none',
                    fontSize: '14px',
                    marginBottom: '12px'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    onClick={() => setPhotoPreview(null)}
                    style={{ flex: 1, padding: '10px', background: '#F1F5F9', border: 'none', borderRadius: '12px', fontWeight: '700', color: '#64748B', cursor: 'pointer' }}
                  >
                    Verwerfen
                  </button>
                  <button
                    onClick={savePhoto}
                    style={{ flex: 2, padding: '10px', background: 'linear-gradient(135deg, #B197FC, #E599F7)', border: 'none', borderRadius: '12px', fontWeight: '800', color: 'white', cursor: 'pointer' }}
                  >
                    Foto senden ❤️
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              {['#6C5CE7', '#EC4899', '#EF4444', '#10B981', '#3B82F6', '#000000'].map((c) => (
                <button
                  key={c}
                  onClick={() => setBrushColor(c)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: brushColor === c ? '3px solid #4A3E6D' : 'none',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>

            <canvas
              ref={canvasRef}
              width={330}
              height={280}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{
                background: '#FAF9FE',
                borderRadius: '20px',
                border: '2px dashed #DDD6FE',
                cursor: 'crosshair'
              }}
            />

            <input
              type="text"
              value={drawingCaption}
              onChange={(e) => setDrawingCaption(e.target.value)}
              placeholder="Süße Nachricht dazuschreiben..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #DDD6FE',
                outline: 'none',
                fontSize: '14px',
                marginTop: '12px'
              }}
            />

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '12px' }}>
              <button
                onClick={clearCanvas}
                style={{ flex: 1, padding: '12px', background: '#F1F5F9', border: 'none', borderRadius: '16px', fontWeight: '700', color: '#64748B', cursor: 'pointer' }}
              >
                Löschen
              </button>
              <button
                onClick={saveDrawing}
                style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #B197FC, #E599F7)', border: 'none', borderRadius: '16px', fontWeight: '800', color: 'white', cursor: 'pointer', boxShadow: '0 4px 15px rgba(177,151,252,0.4)' }}
              >
                Senden ❤️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BUCKETLIST TAB ================= */}
      {activeTab === 'ziele' && (
        <div style={{ paddingBottom: '100px' }}>
          <h2 style={{ fontSize: '20px', color: '#4A3E6D', fontWeight: '800', textAlign: 'center', marginBottom: '16px' }}>
            Unsere Bucket List ✨
          </h2>

          {/* Eingabeleiste im weißen Karten-Design */}
          <div className="white-card" style={{ marginBottom: '20px' }}>
            <form onSubmit={handleAddBucketItem} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Neues Ziel oder Erlebnis..."
                value={newBucketTitle}
                onChange={(e) => setNewBucketTitle(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#475569',
                  backgroundColor: '#F8FAFC'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #B197FC, #E599F7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  fontWeight: '800',
                  fontSize: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(177,151,252,0.3)'
                }}
              >
                +
              </button>
            </form>
          </div>

          {/* Alle gespeicherten Ziele */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bucketList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggleBucketItem(item.id, item.is_completed)}
                className="white-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  margin: 0,
                  cursor: 'pointer',
                  opacity: item.is_completed ? 0.6 : 1
                }}
              >
                <span style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  textDecoration: item.is_completed ? 'line-through' : 'none',
                  color: item.is_completed ? '#94A3B8' : '#475569'
                }}>
                  {item.title}
                </span>
                <span style={{ fontSize: '20px' }}>
                  {item.is_completed ? '✅' : '⭕'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 4: GALERIE ================= */}
      {activeTab === 'galerie' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', paddingBottom: '40px' }}>
          <p className="section-title">UNSERE GALERIE</p>

          {galleryImages.length === 0 ? (
            <div className="white-card" style={{ width: '100%', maxWidth: '390px', textAlign: 'center', color: '#94A3B8' }}>
              Noch keine Fotos oder Zeichnungen da. Male oder knipse etwas im zweiten Tab! 🎨📸
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: '390px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* 1. HERO BAUSTEIN: Neuster Post */}
              {galleryImages[0] && (() => {
                const latest = galleryImages[0];
                return (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                    <p className="section-title" style={{ marginBottom: '8px' }}>NEUESTE ERINNERUNG ✨</p>
                    <div
                      className="white-card"
                      style={{
                        padding: '12px',
                        marginBottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '58vh',
                        boxShadow: '0 10px 30px rgba(108, 92, 231, 0.12)'
                      }}
                    >
                      <div
                        onClick={() => setSelectedImageModal(latest)}
                        style={{
                          width: '100%',
                          flex: 1,
                          minHeight: '280px',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          background: '#FAF9FE',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img
                          src={latest.image_url}
                          alt="Neuester Beitrag"
                          style={{
                            width: '100%',
                            height: '100%',
                            maxHeight: '48vh',
                            objectFit: 'contain',
                            display: 'block'
                          }}
                        />
                      </div>

                      {latest.author_name && (
                        <p style={{ fontSize: '11px', color: '#8E8A9F', fontWeight: '800', letterSpacing: '0.5px', marginTop: '8px', textAlign: 'center' }}>
                          VON {latest.author_name.toUpperCase()}
                        </p>
                      )}

                      {latest.caption && (
                        <p style={{ fontSize: '15px', color: '#475569', fontStyle: 'italic', margin: '4px 8px 4px 8px', textAlign: 'center', fontWeight: '500' }}>
                          "{latest.caption}"
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', padding: '0 8px' }}>
                        <button
                          onClick={() => toggleFavorite(latest.id, latest.is_favorite)}
                          style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', padding: '4px' }}
                        >
                          {latest.is_favorite ? '❤️' : '🤍'}
                        </button>
                        <button
                          onClick={() => deleteDrawing(latest.id)}
                          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 2. FAVORITEN */}
              {(() => {
                const favorites = galleryImages.filter(img => img.is_favorite);
                if (favorites.length === 0) return null;

                return (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                    <p className="section-title" style={{ marginBottom: '8px' }}>FAVORITEN ❤️</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {favorites.map((img) => (
                        <div
                          key={`fav-${img.id}`}
                          className="white-card"
                          style={{
                            padding: '8px',
                            marginBottom: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            height: '100%'
                          }}
                        >
                          <div
                            onClick={() => setSelectedImageModal(img)}
                            style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '16px', overflow: 'hidden', background: '#FAF9FE', cursor: 'pointer' }}
                          >
                            <img
                              src={img.image_url}
                              alt="Favorit"
                              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                            />
                          </div>

                          {img.author_name && (
                            <p style={{ fontSize: '10px', color: '#8E8A9F', fontWeight: '800', marginTop: '4px', textAlign: 'center' }}>
                              {img.author_name}
                            </p>
                          )}

                          {img.caption && (
                            <p style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', margin: '2px 4px 2px 4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              "{img.caption}"
                            </p>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', padding: '0 4px' }}>
                            <button
                              onClick={() => toggleFavorite(img.id, img.is_favorite)}
                              style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '2px 4px' }}
                            >
                              ❤️
                            </button>
                            <button
                              onClick={() => deleteDrawing(img.id)}
                              style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', padding: '2px 4px' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 3. WEITERE ERINNERUNGEN */}
              {(() => {
                const otherImages = galleryImages.filter(img => !img.is_favorite);
                if (otherImages.length === 0) return null;

                return (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                    <p className="section-title" style={{ marginBottom: '8px' }}>WEITERE ERINNERUNGEN 🖼️</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {otherImages.map((img) => (
                        <div
                          key={`all-${img.id}`}
                          className="white-card"
                          style={{
                            padding: '8px',
                            marginBottom: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            height: '100%'
                          }}
                        >
                          <div
                            onClick={() => setSelectedImageModal(img)}
                            style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '16px', overflow: 'hidden', background: '#FAF9FE', cursor: 'pointer' }}
                          >
                            <img
                              src={img.image_url}
                              alt="Erinnerung"
                              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                            />
                          </div>

                          {img.author_name && (
                            <p style={{ fontSize: '10px', color: '#8E8A9F', fontWeight: '800', marginTop: '4px', textAlign: 'center' }}>
                              {img.author_name}
                            </p>
                          )}

                          {img.caption && (
                            <p style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', margin: '2px 4px 2px 4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              "{img.caption}"
                            </p>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', padding: '0 4px' }}>
                            <button
                              onClick={() => toggleFavorite(img.id, img.is_favorite)}
                              style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '2px 4px' }}
                            >
                              🤍
                            </button>
                            <button
                              onClick={() => deleteDrawing(img.id)}
                              style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', padding: '2px 4px' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

            </div>
          )}
        </div>
      )}

      {/* ================= GROSSANSICHT MODAL (LIGHTBOX) ================= */}
      {selectedImageModal && (
        <div
          onClick={() => setSelectedImageModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 300,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '80%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <button
              onClick={() => setSelectedImageModal(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '28px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
            <img
              src={selectedImageModal.image_url}
              alt="Großansicht"
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                objectFit: 'contain'
              }}
            />
            {selectedImageModal.author_name && (
              <p style={{ color: '#B197FC', fontSize: '12px', fontWeight: '800', marginTop: '12px', letterSpacing: '1px' }}>
                VON {selectedImageModal.author_name.toUpperCase()}
              </p>
            )}
            {selectedImageModal.caption && (
              <p style={{ color: 'white', fontSize: '16px', fontStyle: 'italic', marginTop: '4px', textAlign: 'center' }}>
                "{selectedImageModal.caption}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          background: '#4A3E6D',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '30px',
          fontWeight: '700',
          fontSize: '13px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 200
        }}>
          {toastMessage}
        </div>
      )}

{/* ================= BENACHRICHTIGUNGS-MODAL ================= */}
      {notificationModal && (
        <div
          onClick={() => setNotificationModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="white-card"
            style={{
              width: '100%',
              maxWidth: '340px',
              padding: '24px',
              textAlign: 'center',
              marginBottom: 0,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
          >
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>
              {notificationModal.type === 'mood' ? '🫂' : '💌'}
            </span>
            <h3 style={{ fontSize: '18px', color: '#4A3E6D', fontWeight: '800', marginBottom: '8px' }}>
              {notificationModal.title}
            </h3>
            {notificationModal.body && (
              <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px', lineHeight: '1.4' }}>
                {notificationModal.body}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notificationModal.type === 'mood' ? (
                <button
                  onClick={sendReplyNotification}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #B197FC, #E599F7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(177,151,252,0.4)'
                  }}
                >
                  Umarmung zurücksenden 🫂❤️
                </button>
              ) : (
                <button
                  onClick={() => {
                    setActiveTab('galerie');
                    setNotificationModal(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #B197FC, #E599F7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(177,151,252,0.4)'
                  }}
                >
                  Zur Galerie ❤️
                </button>
              )}

              <button
                onClick={() => setNotificationModal(null)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#F1F5F9',
                  color: '#64748B',
                  border: 'none',
                  borderRadius: '14px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BOTTOM NAVIGATION BAR ================= */}
      <div className="bottom-nav">
        <button
          className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span className="nav-icon">🏠</span>
          <span>Home</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'malen' ? 'active' : ''}`}
          onClick={() => setActiveTab('malen')}
        >
          <span className="nav-icon">🎨</span>
          <span>Message</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'ziele' ? 'active' : ''}`}
          onClick={() => setActiveTab('ziele')}
        >
          <span className="nav-icon">✨</span>
          <span>Bucketlist</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'galerie' ? 'active' : ''}`}
          onClick={() => setActiveTab('galerie')}
        >
          <span className="nav-icon">🖼️</span>
          <span>Galerie</span>
        </button>
      </div>

    </div>
  );
}