self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Unsere Liebes-App ❤️';
    const options = {
      body: data.body || 'Neue Benachrichtigung für dich!',
      icon: '/icon.png',
      badge: '/icon.png',
      data: { url: data.url || '/' }
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error handling push event:', err);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const title = encodeURIComponent(event.notification.title || '');
  const body = encodeURIComponent(event.notification.body || '');
  // Parameter an die URL anfügen
  const targetUrl = `/?notifTitle=${title}&notifBody=${body}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(self.location.origin) && 'navigate' in client) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});