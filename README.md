# Fluento - 30 Days English Learning PWA

Mobile-first multi-page PWA using HTML, CSS, JavaScript, Firebase Authentication, and Firestore.

## Setup

1. Create a Firebase project.
2. Enable Authentication methods: 
   - Email/Password
   - Google
3. Enable Cloud Firestore.
4. Update `js/firebase.js` with your Firebase config.
5. Serve this folder using a local static server (HTTPS recommended for PWA + auth popup).

## Firestore Collections

### `users/{uid}`
- `name` (string)
- `email` (string)
- `photoURL` (string)
- `learningStart` (ISO string)
- `speakingCompleted` (array<number>)
- `listeningCompleted` (array<number>)

### `taskCatalog/english30` (optional)
If present, app reads task content from Firestore. If missing, it uses built-in defaults.

- `speaking`: array of `{ day, title, duration, text }`
- `listening`: array of `{ day, title, duration, videoId, vocab }`
- `extraSpeaking`: array of strings
- `extraListening`: array of `{ title, videoId, vocab }`

## Pages

- `login.html`
- `dashboard.html`
- `speaking.html`
- `listening.html`
- `extra.html`
- `about.html`

## PWA

- Manifest: `pwa/manifest.json`
- Worker copies:
  - `service-worker.js` (registered at root scope)
  - `pwa/service-worker.js` (kept for requested structure)
