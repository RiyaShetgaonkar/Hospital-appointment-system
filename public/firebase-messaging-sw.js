// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDomNH7V0dxt_trHrUwghmUqd9eoUHxWYo",
    projectId: "hospital-system-88ee9",
    messagingSenderId: "1052835799972",
    appId: "1:1052835799972:web:81b5f73457d76b777ad731"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification.title;
  const options = {
    body: payload.notification.body,
    icon: '/logo.jpeg' // Make sure this image exists
  };
  self.registration.showNotification(title, options);
});