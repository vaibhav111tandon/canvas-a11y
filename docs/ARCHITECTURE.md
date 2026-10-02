# Architecture

A static React/Vite application. Node is used only to install dependencies, build and run unit tests. There is no application backend.

## Layers

1. **Case registry** provides stable metadata, a fixture name, assertion mode and manual steps. Deep links identify cases using `#case=<id>`.
2. **Capability detection** identifies a supported native API generation. No user-agent sniffing or API polyfill.
3. **Runner** owns an isolated-in-time canvas fixture. It draws only from native `paint` events, applies the relevant synchronization adapter, waits for completion, collects evidence, and cleans up listeners/DOM on disposal.
4. **Geometry functions** scan alpha extents, normalize bitmap-to-viewport coordinates, and compare independently measured bounds.
5. **React UI** orchestrates one active session at a time, sequential suite runs, case navigation, the playground, manual observations and report export.

## Evidence and correctness

- Never derive both compared bounds from the same draw matrix.
- Geometry uses one opaque rectangular fixture. Alpha extents include anything actually painted, so complex multi-object/clipped cases are not assigned a misleading automated geometry verdict.
- Canvas CSS background grid is not in the bitmap and therefore does not contaminate the alpha scan.
- A paint timeout is a capability/execution limitation, not successful drawing.
- DOM assertions and manual accessibility observations remain distinct in JSON.
- Programmatic focus checks restore the previously focused control. Manual interaction uses real native controls.
- Results are session-only and exports are versioned. Manual notes are text, never evaluated as HTML or JavaScript.

## Known limitations

No accessibility-tree access, trusted keyboard automation, arbitrary user HTML editor, immutable report hosting, CI browser matrix or general-purpose image segmentation. AABB matching cannot prove shape overlap or hit-testing correctness. Test fixtures are co-resident with the app rather than sandboxed iframes; case authors are trusted source contributors.

## Future extraction

Move pure measurement/detection and result schemas into `packages/core`; fixtures and checks into `packages/browser-tests`; add `packages/cli` for Node/Playwright only once an external runner is needed. The CLI should reuse the evidence schema and stable case IDs, add an explicit CDP/AX evidence source, and never silently substitute DOM bounds for accessibility bounds.
