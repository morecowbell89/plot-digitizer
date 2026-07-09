# Plot Digitizer

A web app for extracting data points from images of plots — datasheets, papers, screenshots. Load a plot image, calibrate the axes, and click points on the curve to read off their values.

This branch is the **React + Vite + TypeScript** version. The original single-file vanilla implementation lives on `main` as `combined-plot-digitizer.html`.

## Running it

Requires [Node.js](https://nodejs.org) (v20+).

```bash
npm install        # one-time setup
npm run dev        # dev server at http://localhost:5173 with hot reload
```

To produce a deployable build:

```bash
npm run build      # type-checks, then outputs static files to dist/
npm run preview    # serve dist/ locally
```

The build output is plain static HTML/JS/CSS — host it on any static file server (GitHub Pages, S3, nginx, …).

## Using it

The sidebar walks through the workflow top to bottom:

1. **Image** — drag and drop a plot image anywhere, click **Load image**, or paste a screenshot with **Ctrl+V**.
2. **Calibration** — click **X Min**, then click that reference point on the image (a magnifier loupe follows the cursor for precision). Enter its value in the box next to the button. Repeat for **X Max**, **Y Min**, and **Y Max**. Flip an axis to **Log** for logarithmic scales.
3. **Digitize** — click **Digitize**, then left-click along the curve to place data points. Values appear in the data panel (the **Data** button toggles it).
4. Export from the data panel with **Copy** (tab-delimited), **MATLAB** (ready-to-run plot script), or **CSV** (file download).

A **?** button in the bottom-left corner lists all keyboard shortcuts.

## Controls

| Action | Input |
|---|---|
| Pan image | Right-click + drag |
| Zoom | Mouse wheel, or the **+** / **−** / **Fit** pill at the bottom |
| Jump to a location | Click the minimap |
| Place a point / marker | Left-click |
| Nudge selected marker or point | Arrow keys (**Shift** for 10× steps) |
| Select a data point | Click its row in the data panel |
| Delete selected point | **Delete** / **Backspace**, or the × on its row |
| Deselect / cancel placement | **Esc** |

## Fine-tuning

- **Calibration markers**: click a min/max button to select its marker, then nudge it with the arrow keys. Zooming in makes nudges finer (one screen pixel per press). All extracted values recompute automatically when calibration changes. While a marker is selected, the data panel dims to show that keyboard input is acting on the marker — press **Digitize** to go back to placing points, or click a data row to edit points.
- **Data points**: select a row in the data panel to highlight the point on the plot (the view pans to it if off-screen), then nudge or delete it.
- **Rotation correction** (on by default) compensates for slightly rotated/skewed plot images using the angle between the X Min and X Max markers.

## Development

See [`CLAUDE.md`](CLAUDE.md) for architecture notes and the verification workflow.
