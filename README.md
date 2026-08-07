# emg2-cmyk.github.io
# Hangout HQ 🍕

**Plan hangouts with your crew.** Schedule events, coordinate rides, and see everyone on the map — all in one place.

---

## ✨ Features

- 📅 **Events** — Create hangouts with a title, date/time, and destination
- ✅ **RSVP** — Going / Maybe / Can't — everyone sees everyone else's status live
- 🚗 **Ride Board** — Offer a ride with seat count; friends can request to join your car
- 🔔 **Ride Requests** — Accept or decline requests; a notification bell alerts you
- 🗺️ **Live Map** — Everyone pins their home location; see drivers, passengers, and the destination on an interactive Leaflet map
- 🌙 **Premium Dark Mode** — Glassmorphism design, smooth animations

---

## 🚀 Quick Start (GitHub Pages Hosting)

### Step 1 — Fork & Host
1. Create a new GitHub repo (e.g. `hangout-hq`)
2. Upload the three files: `index.html`, `style.css`, `app.js`
3. Go to **Settings → Pages → Branch: main → Save**
4. Your site is live at `https://yourusername.github.io/hangout-hq`

### Step 2 — Set Up Firebase (Real-Time Sync for your group)
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → name it "hangout-hq" → Create
3. Click the **</>** (Web) icon → Register app → copy the `firebaseConfig` object
4. Go to **Build → Realtime Database → Create database → Start in test mode**
5. When you open the site for the first time, paste your config in the setup screen

> **Tip**: To avoid the setup screen, you can bake the config directly into `app.js` by adding this at the top:
> ```js
> const FIREBASE_CONFIG = {
>   apiKey: "AIza...",
>   authDomain: "...",
>   databaseURL: "https://your-app-default-rtdb.firebaseio.com",
>   // ...
> };
> ```

### Step 3 — Share with Friends
Send everyone the GitHub Pages URL. Each person:
1. Enters a nickname
2. Pastes the Firebase config (or you bake it in)
3. Sets their home location on the profile map

---

## 🗺️ Adding Destination Coordinates to Events

When creating an event, you can optionally add lat/lng for the destination so it shows as a 📍 on the map. Find coords with:
- [Google Maps](https://maps.google.com) — right-click any location → copy coordinates
- [latlong.net](https://www.latlong.net) — search any address

---

## 🔐 Firebase Security (optional, for later)

The site uses "test mode" rules (open read/write). For better security once you're ready:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

For production you'd add auth-based rules. For a trusted friend group, test mode is fine.

---

## 📁 File Structure

```
hangout-coordinator/
├── index.html     # App shell & all views
├── style.css      # Premium dark-mode design system
├── app.js         # All logic: Firebase, events, rides, map
└── README.md      # This file
```
