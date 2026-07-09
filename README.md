# Plot Digitizer

A single-file web app for extracting data points from images of plots — datasheets, papers, screenshots. Open it in a browser, load a plot image, calibrate the axes, and click points on the curve to read off their values.

No install, no build, no server required: everything lives in [`combined-plot-digitizer.html`](combined-plot-digitizer.html).

## Getting started

1. Open `combined-plot-digitizer.html` in a browser (double-click works; serving over HTTP also works).
2. Load a plot image: drag and drop it, use the file picker, or paste a screenshot with **Ctrl+V**.
3. Calibrate the axes:
   - Click **X Min**, then click that reference point on the image (e.g. where the axis reads 100). Enter its value in the box next to the button.
   - Repeat for **X Max**, **Y Min**, and **Y Max**.
   - Set the **X Scale** / **Y Scale** dropdowns to Log for logarithmic axes.
4. Click **Digitize**, then left-click along the curve to place data points. Values appear in the data panel (the **Data** button toggles it).
5. Export with **Copy** (tab-delimited), **MATLAB** (ready-to-run plot script), or **CSV** (file download).

## Controls

| Action | Input |
|---|---|
| Pan image | Right-click + drag |
| Zoom | Mouse wheel, or the **+** / **−** / **Fit** buttons |
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

There is no build step or dependency — edit the HTML file and reload. See [`CLAUDE.md`](CLAUDE.md) for architecture notes and verification workflow.
