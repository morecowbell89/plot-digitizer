---
name: verify
description: How to run and verify combined-plot-digitizer.html end-to-end in Chrome
---

# Verifying the plot digitizer

Single-file browser app, no build step.

## Launch

```bash
python3 -m http.server 8471 --bind 127.0.0.1   # run from repo root, in background
```

Open `http://127.0.0.1:8471/combined-plot-digitizer.html` with the
claude-in-chrome tools. Serving over HTTP (not `file://`) matters: it lets the
test image be fetched same-origin.

## Load a test image

`datasheet.png` in the repo root is the standard test plot: log-X frequency
response, X axis 100 Hz–1 MHz, Y axis 0–60 dB, two curves (flat regions at
~46.5 dB and ~27 dB). The Chrome file_upload tool rejects host paths, so drive
the app's own change handler instead:

```js
const blob = await (await fetch('/datasheet.png')).blob();
const dt = new DataTransfer();
dt.items.add(new File([blob], 'datasheet.png', {type: 'image/png'}));
const input = document.getElementById('fileInput');
input.files = dt.files;
input.dispatchEvent(new Event('change', {bubbles: true}));
```

Wait ~1s for the image to render before clicking.

## Drive and inspect

- At the default window size the axis origin (100 Hz, 0 dB) lands near screen
  (570, 636); 1 MHz near (1080, 636); 60 dB near (570, 128). Re-screenshot to
  confirm — it shifts with viewport size.
- The app instance is exposed as `digitizer`; read
  `digitizer.calibrationPoints`, `digitizer.dataPoints`,
  `digitizer.selectedMarker`, `digitizer.mode`, `digitizer.scale` via
  javascript_tool to assert state after UI actions.
- Good end-to-end check: calibrate all four points (set X scale to log), click
  Digitize, click the lower curve at ~1 kHz → expect roughly (1000, 27).

## Gotchas

- Clicking the "Choose File" input resets all state by design — don't click
  it; use the DataTransfer injection above.
- The paste path (`handlePaste`) can open a `confirm()` dialog when an image
  is already loaded — a real dialog blocks the Chrome extension, so don't
  trigger it from automation.
- Quick syntax gate without a browser: extract the `<script>` body to a file
  and `node --check` it.
