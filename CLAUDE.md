# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-based plot digitizer: load an image of a plot, calibrate the axes with four min/max markers, click points on a curve to extract their data values. This branch is a React + Vite + TypeScript port of the original single-file vanilla app (still on `main` as `combined-plot-digitizer.html`). There is no test suite; verification is done by driving the app in a real browser.

## Commands

```bash
npm install
npm run dev                  # dev server on http://localhost:5173
npm run build                # tsc --noEmit type check, then vite build to dist/
npm run preview -- --port 4173   # serve the production build
```

`npm run build` is the fastest correctness gate — it type-checks everything.

For end-to-end verification, follow `.claude/skills/verify/SKILL.md`: serve the app, load a synthetic test image through the file input, calibrate, place points, and assert on `window.__digitizer` (a debug handle exposing `{ state, viewport }`).

## Architecture

All app state lives in a single reducer (`src/state.ts`); components dispatch actions and render from state. The few things that aren't in the reducer are viewport pan/zoom and viewer size, owned by `App.tsx` as local state.

**Mode state machine.** `state.mode` is `'idle'`, a marker key (`'xMin' | 'xMax' | 'yMin' | 'yMax'` — placing/adjusting that calibration marker), or `'digitizing'` (canvas clicks add data points). Entering a marker mode implicitly exits digitizing; the Digitize/Stop button pair is derived from `mode`, so there is no separate button state to keep in sync.

**Single-selection invariant.** `state.selection` is a discriminated union: `{kind:'marker', axis}` or `{kind:'point', index}` or `null`. Arrow-key nudging, Delete, the overlay's selection ring, and the data panel's `marker-focus` dim all derive from it. Because it's one field, marker and point selection cannot coexist by construction.

**Data values are derived, never stored.** `state.dataPoints` holds image-pixel positions only. Data values are computed at render/export time by `extractDataPoint` (`src/lib/calibration.ts`) from the current calibration — so the table can never drift from the calibration, and there is no recompute step to forget. `completeCalibration()` is the gate that parses/validates calibration; everything that needs values goes through it.

**Two coordinate systems.** Points are stored in image pixels (also the overlay canvas resolution). The view is a CSS transform on `.canvas-container`: `screen = image * scale + translate`, with `viewport` state in `App.tsx`. Convert screen→image with `(client - rect - translate) / scale`. Arrow-key nudges divide by `scale` so one keypress is one *screen* pixel.

**Rendering split.** DOM UI is ordinary React; the markers/points overlay is imperative canvas drawing (`src/lib/overlay.ts`), repainted by an effect in `Viewer.tsx` whenever calibration points, data points, or selection change.

**Pure logic lives in `src/lib/`** (calibration math with rotation correction and log scales, value formatting, exporters) with no React imports — test or reuse it freely.

## Gotchas

- Clicking the file input ("Choose File") intentionally resets all state — image, calibration, and points. Don't trigger it from automation; inject files by setting `files` on the input and dispatching a `change` event.
- The paste handler opens a `confirm()` dialog when an image is already loaded; native dialogs block browser automation.
- The wheel-zoom listener is attached natively (`{ passive: false }`) in `Viewer.tsx` because React's synthetic wheel handler can't `preventDefault`.
- `window.__digitizer = { state, viewport }` is refreshed on every render for automation/debugging; it's read-only state, not a way to mutate the app.
