# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-based plot digitizer: load an image of a plot, calibrate the axes with four min/max markers, click points on a curve to extract their data values. The entire app — CSS, HTML, and JS — is one file, `combined-plot-digitizer.html`. There is no build step, no dependencies, and no test suite; verification is done by driving the app in a real browser.

## Commands

```bash
# Serve the app (required for automated verification; plain file:// works for manual use)
python3 -m http.server 8471 --bind 127.0.0.1   # from repo root, in background

# Quick syntax gate without a browser: extract the <script> body and check it
python3 -c "
import re
html = open('combined-plot-digitizer.html').read()
open('/tmp/script-body.js','w').write(re.search(r'<script>(.*)</script>', html, re.S).group(1))
" && node --check /tmp/script-body.js
```

For end-to-end verification (loading a test image, calibrating, clicking points, asserting state), follow `.claude/skills/verify/SKILL.md`. It is written for the claude-in-chrome tools; in environments without them, `playwright-core` with the pre-installed Chromium (`executablePath: '/opt/pw-browsers/chromium-*/chrome-linux/chrome'`) works the same way — generate a test plot on an in-page `<canvas>` and inject it through the file input's change handler, since the referenced `datasheet.png` is not committed.

## Architecture

Everything is in the `AdvancedPlotDigitizer` class, instantiated as the global `digitizer` — automation can read `digitizer.mode`, `digitizer.calibrationPoints`, `digitizer.dataPoints`, `digitizer.selectedMarker`, `digitizer.selectedDataPoint`, `digitizer.scale` to assert state.

**Mode state machine.** `this.mode` is one of `'idle'`, a calibration placement mode (`'xMin' | 'xMax' | 'yMin' | 'yMax'`), or `'digitizing'`. `setMode()` handles entering modes (button highlighting, cursor class, restoring the Digitize/Stop button pair); exits back to `'idle'` are assigned directly at the exit sites (marker placed, Escape, row selection, clear).

**Single-selection invariant.** At most one thing owns the selection at a time: a calibration marker (`selectedMarker`, a mode-name string) or a data point (`selectedDataPoint`, an index). Every path that sets one must clear the other — arrow-key nudging and the Delete key dispatch on which is set. The data panel dims (`updateDataPanelFocus`, CSS class `marker-focus`) whenever a marker owns the selection or a placement mode is active, to signal that keyboard input is not acting on the data table.

**`redrawOverlay()` is the choke point.** Every selection or point change funnels through it; it repaints the overlay canvas and syncs the data panel dim state. If you add a new way to change selection, call `redrawOverlay()` and the invariant above takes care of the rest.

**Two coordinate systems.** Calibration points and data points are stored in image pixels (`imageX`/`imageY`), which is also the overlay canvas resolution. The view is a CSS transform (`translate(translateX, translateY) scale(scale)`) on `.canvas-container`. Convert screen→image with `(clientXY - rect - translate) / scale`; image→screen with `image * scale + translate`. Arrow-key nudges divide by `scale` so one keypress is one *screen* pixel.

**Data values are derived.** A data point's source of truth is its image position; `dataX`/`dataY` are recomputed from it by `extractDataPoint()` (linear or log interpolation between calibration values, optional rotation correction from the X-axis marker angle). Any change to calibration markers, calibration values, scale type, or rotation correction must call `recomputeDataPoints()` so the table stays consistent.

**Global keyboard handler.** `handleKeyDown` is on `document` and early-returns when focus is in an input/select/textarea. Arrow keys nudge the selection, Escape deselects/cancels placement, Delete removes the selected data point.

## Gotchas

- Clicking the file input ("Choose File") intentionally resets all state — image, calibration, and points. Don't trigger it from automation; inject files via `DataTransfer` + a `change` event instead.
- `handlePaste` opens a `confirm()` dialog when an image is already loaded; native dialogs block browser automation.
- Rows in the data table are rebuilt from scratch by `renderDataTable()` (innerHTML), so don't hold references to row elements.
