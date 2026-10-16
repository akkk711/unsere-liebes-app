self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Unsere Liebes-App ❤️';
    const options = {
      body: data.body || 'Neue Benachrichtigung für dich!',
      icon: '/icon.png',
      badge: '/icon.png',
      data: {
        url: data.url || '/',
        type: data.type || 'general'
      }
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error handling push event:', err);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const title = event.notification.title || '';
  const body = event.notification.body || '';
  const notifData = event.notification.data || {};
  const type = notifData.type || 'general';

  const encodedTitle = encodeURIComponent(title);
  const encodedBody = encodeURIComponent(body);
  const encodedType = encodeURIComponent(type);

  const targetUrl = `/?notifTitle=${encodedTitle}&notifBody=${encodedBody}&notifType=${encodedType}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            notifTitle: title,
            notifBody: body,
            notifType: type
          });
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});