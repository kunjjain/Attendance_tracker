# Christ University Attendance Tracker — Chrome Extension

Automatically reads your attendance cards and shows:
- 📗 How many classes you **can skip** and stay above 85%
- 📕 How many classes you **need to attend** to reach 85%

---

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Turn on **Developer mode** (toggle, top right)
3. Click **Load unpacked**
4. Select this folder (`attendance-extension/`)
5. Navigate to your Christ University attendance portal
6. The panel appears bottom-right automatically ✅

---

## How it works

The extension scans your attendance page for the pattern **"X of Y hours attended"** inside each subject card, then computes:

| Formula | Purpose |
|---|---|
| `(0.85 × total − attended) / 0.15` | Classes needed to hit 85% |
| `attended / 0.85 − total` | Classes you can skip |

---

## Troubleshooting

**Panel shows "No subject data found"**
- Make sure you're on the **Course Overview** tab (not Daily Log)
- Try refreshing the page after the tab loads fully

**Wrong subject names showing**
- The extension picks the first bold text inside each card
- If your portal uses different HTML, open `content.js` and adjust the `name` selector on line ~38

---

## Changing the target %

Open `content.js` and change line 4:
```js
const TARGET = 85; // change to 75 or whatever your college requires
```

---

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension config |
| `content.js` | Scrapes attendance data + injects panel |
| `panel.css` | Dark-themed panel UI |
| `icon.png` | Extension icon |
