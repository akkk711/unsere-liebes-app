import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabase } from '@/lib/supabase';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:support@liebes-app.de',
    publicKey,
    privateKey
  );
}

export async function POST(request: Request) {
  try {
    const { title, body, senderUserId, type = 'general' } = await request.json();

    // 1. Alle Subscriptions aus Supabase laden
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error || !subscriptions) {
      return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
    }

    // 2. Nur Abos von anderen Benutzern filtern
    const targetSubscriptions = subscriptions.filter((sub) => sub.user_id !== senderUserId);

    // 3. DEDUPLIZIERUNG: Jedes Gerät (Endpoint) nur EINMAL anschreiben!
    const uniqueMap = new Map();
    targetSubscriptions.forEach((sub) => {
      const endpoint = sub.subscription?.endpoint;
      if (endpoint && !uniqueMap.has(endpoint)) {
        uniqueMap.set(endpoint, sub);
      }
    });
    const uniqueSubscriptions = Array.from(uniqueMap.values());

    // 4. An jedes eindeutige Gerät senden
    const sendPromises = uniqueSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({ title, body, type, url: '/' })
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}