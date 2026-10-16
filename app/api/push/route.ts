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

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error || !subscriptions) {
      return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
    }

    const sendPromises = subscriptions
      .filter((sub) => sub.user_id !== senderUserId)
      .map(async (sub) => {
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