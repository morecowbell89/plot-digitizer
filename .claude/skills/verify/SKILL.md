---
name: verify
description: How to run and verify the plot digitizer end-to-end in Chrome
---

# Verifying the plot digitizer

Vite + React + TypeScript app.

## Launch

```bash
npm install               # if node_modules is missing
npm run build             # type check + production build (fast correctness gate)
npm run preview -- --port 4173   # serve dist/, in background
```

Open `http://127.0.0.1:4173/` with the claude-in-chrome tools, or — in
environments without them — `playwright-core` with the pre-installed Chromium
(`executablePath: '/opt/pw-browsers/chromium-*/chrome-linux/chrome'`).
For iterating, `npm run dev` (port 5173) works the same way with hot reload.

## Load a test image

No test image is committed. Generate a plot on an in-page canvas and drive the
file input's change handler (the Chrome file_upload tool rejects host paths):

```js
const c = document.createElement('canvas');
c.width = 800; c.height = 600;
const ctx = c.getContext('2d');
ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 800, 600);
ctx.strokeStyle = 'black'; ctx.lineWidth = 2;
ctx.strokeRect(100, 50, 600, 500);   // axes box: x 100..700px, y 550..50px
const blob = await new Promise(r => c.toBlob(r, 'image/png'));
const dt = new DataTransfer();
dt.items.add(new File([blob], 'test.png', {type: 'image/png'}));
const input = document.querySelector('input[type=file]');
Object.defineProperty(input, 'files', {value: dt.files, configurable: true});
input.dispatchEvent(new Event('change', {bubbles: true}));
```

Wait ~1s for the image to render before clicking.

## Drive and inspect

- Calibration buttons have ids `#setXMin`, `#setXMax`, `#setYMin`, `#setYMax`;
  each value input is its adjacent sibling (`#setXMin + input`). Digitize/Stop
  are `#startDigitizing` / `#stopDigitizing` (only one exists at a time).
- Convert image coords to screen coords for clicks via the debug handle:
  `window.__digitizer.viewport` (`{scale, translateX, translateY}`) plus the
  `.viewer-surface` bounding rect: `screen = rect + image * scale + translate`.
- Assert on `window.__digitizer.state`: `mode`, `selection`
  (`{kind:'marker'|'point', ...}` or null), `dataPoints` (image coords only —
  data values are derived), `panelOpen`, `calibration`.
- Good end-to-end check with the canvas above calibrated as x: 0→60,
  y: 0→100 — clicking image (400, 300) must yield table row (30, 50).

## Gotchas

- Clicking the "Choose File" input resets all state by design — don't click
  it; use the DataTransfer injection above.
- The paste path can open a `confirm()` dialog when an image is already
  loaded — a real dialog blocks the Chrome extension, so don't trigger it
  from automation.
- The data panel only renders while open (`#toggleDataPanel` button) and is
  `display: none` below 800px viewport width.
