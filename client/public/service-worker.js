self.addEventListener('push', (event) => {
  let payload;
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('Received an invalid push notification payload.', error);
    return;
  }

  const data = payload.data || {};
  event.waitUntil(self.registration.showNotification(payload.title || 'MSU Pakawit', {
    body: payload.body || 'There is an update to your errand.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      errandId: data.errandId,
      status: data.status,
      type: data.type,
      url: data.url,
    },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const errandId = event.notification.data && event.notification.data.errandId;
  if (!errandId) return;

  const targetUrl = new URL(`/errands/${encodeURIComponent(errandId)}`, self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    const existingClient = windowClients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existingClient) {
      return existingClient.navigate(targetUrl).then((client) => client ? client.focus() : clients.openWindow(targetUrl));
    }
    return clients.openWindow(targetUrl);
  }));
});
