'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'malen' | 'ziele' | 'galerie'>('home');
  
  // --- ZEIT & JAHRESTAG ---
  const startDate = new Date('2026-08-20T00:00:00'); // Euer Beziehungsstart
  const [timeTogether, setTimeTogether] = useState({ days: 57, hours: 0, minutes: 0, seconds: 0 });
  const [daysToNextAnniversary, setDaysToNextAnniversary] = useState(308);

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

      // Nächster Jahrestag (20. August)
      let nextAnniv = new Date(now.getFullYear(), 7, 20); // Monat 7 ist August
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

  // --- MOOD TRACKER ---
  const [selectedMood, setSelectedMood] = useState<string>('😊');

  const handleMoodSelect = async (emoji: string) => {
    setSelectedMood(emoji);
    try {
      await supabase.from('moods').insert([{ mood_emoji: emoji, user_name: 'Partner' }]);
    } catch (e) {
      console.log('Mood gesichert');
    }
  };

  // --- MALEN (CANVAS) ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#6C5CE7');
  const [brushSize, setBrushSize] = useState(4);
  const [showToast, setShowToast] = useState(false);

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
  };

  const saveDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    try {
      await supabase.from('drawings').insert([{ image_url: dataUrl }]);
    } catch (e) {
      console.log('Drawing local saved');
    }

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // --- BUCKETLIST ---
  const [goals, setGoals] = useState<{ id: string; title: string; is_completed: boolean }[]>([
    { id: '1', title: 'Picknick bei Sonnenuntergang machen 🧺', is_completed: true },
    { id: '2', title: 'Wochenendtrip nach Paris buchen 🗼', is_completed: false },
    { id: '3', title: 'Gemeinsam einen Töpferkurs besuchen 🎨', is_completed: false }
  ]);
  const [newGoalInput, setNewGoalInput] = useState('');

  const fetchGoals = async () => {
    const { data } = await supabase.from('bucketlist').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) setGoals(data);
  };

  useEffect(() => {
    if (activeTab === 'ziele') fetchGoals();
    if (activeTab === 'galerie') fetchGallery();
  }, [activeTab]);

  const addGoal = async () => {
    if (!newGoalInput.trim()) return;
    const newGoalObj = { title: newGoalInput, is_completed: false };
    setGoals([{ id: Date.now().toString(), ...newGoalObj }, ...goals]);
    setNewGoalInput('');
    try {
      await supabase.from('bucketlist').insert([newGoalObj]);
    } catch (e) {}
  };

  const toggleGoal = async (id: string, currentStatus: boolean) => {
    setGoals(goals.map(g => g.id === id ? { ...g, is_completed: !currentStatus } : g));
    try {
      await supabase.from('bucketlist').update({ is_completed: !currentStatus }).eq('id', id);
    } catch (e) {}
  };

  // --- GALERIE ---
  const [galleryImages, setGalleryImages] = useState<{ id: string; image_url: string }[]>([]);

  const fetchGallery = async () => {
    const { data } = await supabase.from('drawings').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) setGalleryImages(data);
  };

  return (
    <div className="app-viewport">

      {/* ================= TAB 1: HOME ================= */}
      {activeTab === 'home' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
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
            <p style={{ fontSize: '13px', color: '#8E8A9F', fontWeight: '800', tracking: '1px', marginBottom: '20px' }}>
              TAGEN
            </p>
          
            <div className="pink-gradient-banner">
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Nächster Jahrestag in</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '800' }}>
                {daysToNextAnniversary} Tagen ❤️
              </p>
            </div>
          </div>

          {/* Süßer Gedanke Card */}
          <div className="white-card" style={{ position: 'relative' }}>
            <h2 style={{ fontSize: '18px', color: '#4A3E6D', fontWeight: '800', textAlign: 'center', margin: '0 0 16px 0' }}>
              Süßer Gedanke
            </h2>
            <span style={{ position: 'absolute', left: '20px', top: '48px', fontSize: '32px', color: '#DDD6FE', fontFamily: 'serif' }}>
              "
            </span>
            <p style={{ textAlign: 'center', color: '#475569', fontStyle: 'italic', fontSize: '15px', margin: '12px 0 0 0', padding: '0 16px' }}>
              Liebe ist, wenn du der Grund bist, warum ich lächle.
            </p>
          </div>
        </div>
      )}

      {/* ================= TAB 2: MALEN ================= */}
      {activeTab === 'malen' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p className="section-title">ETWAS FÜR DICH MALEN</p>
          <div className="white-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* Color Selector */}
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

            {/* Drawing Canvas */}
            <canvas
              ref={canvasRef}
              width={330}
              height={320}
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

            {/* Controls */}
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
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

      {/* ================= TAB 3: ZIELE ================= */}
      {activeTab === 'ziele' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p className="section-title">UNSERE BUCKETLIST</p>
          <div className="white-card">
            
            {/* Input New Goal */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                type="text"
                value={newGoalInput}
                onChange={(e) => setNewGoalInput(e.target.value)}
                placeholder="Neues Ziel eintragen..."
                style={{ flex: 1, padding: '12px 16px', borderRadius: '16px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px' }}
              />
              <button
                onClick={addGoal}
                style={{ padding: '12px 18px', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '700', cursor: 'pointer' }}
              >
                +
              </button>
            </div>

            {/* Goal Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id, goal.is_completed)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '16px',
                    background: goal.is_completed ? '#F8FAFC' : '#FAF9FE',
                    border: '1px solid #F1F5F9',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>
                    {goal.is_completed ? '✅' : '⚪'}
                  </span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: goal.is_completed ? '#94A3B8' : '#334155',
                    textDecoration: goal.is_completed ? 'line-through' : 'none'
                  }}>
                    {goal.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: GALERIE ================= */}
      {activeTab === 'galerie' && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p className="section-title">UNSERE GALERIE</p>
          <div style={{ width: '100%', maxWidth: '390px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {galleryImages.length === 0 ? (
              <div className="white-card" style={{ gridColumn: 'span 2', textAlign: 'center', color: '#94A3B8' }}>
                Noch keine Zeichnungen da. Male etwas im zweiten Tab! 🎨
              </div>
            ) : (
              galleryImages.map((img) => (
                <div key={img.id} className="white-card" style={{ padding: '8px', marginBottom: 0 }}>
                  <img src={img.image_url} alt="Kunstwerk" style={{ width: '100%', borderRadius: '16px', background: '#FAF9FE' }} />
                </div>
              ))
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
          🎨 Kunstwerk in Galerie gespeichert! ❤️
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
          <span>Malen</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'ziele' ? 'active' : ''}`}
          onClick={() => setActiveTab('ziele')}
        >
          <span className="nav-icon">✨</span>
          <span>Ziele</span>
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