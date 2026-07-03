# Christ University Attendance Tracker — Chrome Extension

Automatically reads your attendance cards and shows:
- 📗 How many classes you **can skip** and stay above 85%
- 📕 How many classes you **need to attend** to reach 85%

---

## Downloading & Installing from GitHub
### Windows

- Click the green Code button on this page → Download ZIP
- Right-click the downloaded ZIP → Extract All
- Open Chrome and go to chrome://extensions/
- Enable Developer mode (toggle, top-right)
- Click Load unpacked → select the extracted folder
- Done! Open the ESPro portal and go to Course Overview

### Mac

- Click the green Code button on this page → Download ZIP
- Double-click the downloaded ZIP to extract it (goes to your Downloads folder)
- Open Chrome and go to chrome://extensions/
- Enable Developer mode (toggle, top-right)
- Click Load unpacked → select the extracted folder
- Done! Open the ESPro portal and go to Course Overview

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


## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension config |
| `content.js` | Scrapes attendance data + injects panel |
| `panel.css` | Dark-themed panel UI |
| `icon.png` | Extension icon |
