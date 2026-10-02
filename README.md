# Canvas A11y

**Canvas A11y is an open-source accessibility test suite and playground for HTML-in-Canvas. Test semantics, focus, keyboard navigation, geometry synchronization, and assistive-technology behavior while the platform is still evolving.**

An experimental browser laboratory, not a production-readiness badge or WCAG certification tool.

## Run locally

Requires Node 22.12+ for development/build tooling only. The application runs entirely in the browser; it has no Node backend, accounts, telemetry, or report server.

```sh
npm ci
npm run dev
# Open http://localhost:4173
npm run lint
npm run format:check
npm test
npm run build
npm run preview
```

Deploy the `dist/` directory to any static host. Vite uses relative asset paths so deployment under a GitHub Pages repository path works. All application navigation uses fragments; no server rewrites are needed.

## What works in V1

- 20 stable, individually linkable test cases: `/#case=geometry-sync`.
- A native canvas fixture for each case; unsupported browsers get explanations, not simulated results.
- Geometry comparison using **actual raster alpha bounds** and independently obtained `getBoundingClientRect()` bounds, normalized to viewport CSS pixels.
- Translation, rotation, composed transforms, dynamic repositioning, focus retention, removal and disabled-control checks.
- DOM semantic/ARIA preconditions, accompanied by manual accessibility-tree and screen-reader verification instructions.
- An interactive transform playground with a deliberately broken synchronization mode.
- Sequential test runner, result details, manual observation records and JSON export.
- Runtime detection for the newer `content="drawable"` proposal and earlier `layoutsubtree` implementation.

## Experimental API setup

The upstream API is changing. Verification snapshot: **2026-10-02**. Read [the API status document](docs/API-STATUS.md) before interpreting results.

1. Use a recent Chrome Canary build.
2. Enable `chrome://flags/#canvas-draw-element`.
3. Enable `chrome://flags/#enable-experimental-web-platform-features` when required by the current WICG instructions.
4. Relaunch and reload. Open **Browser Support** to inspect detected capabilities.

For an Origin Trial, register the actual site origin and install the token issued for that origin, e.g. `<meta http-equiv="origin-trial" content="YOUR_ISSUED_TOKEN">` in `index.html`. Check the trial's current expiry and supported milestones. This repository does not include a token, and a historical Chrome trial announcement does not establish current availability.

The runner detects support by API presence and checks that a native paint completes. It never uses html2canvas, SVG screenshots, a polyfill, or fabricated accessibility results.

## Interpreting results

| Status      | Meaning                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PASS        | The listed automated assertions passed in this browser session.                                                                                                    |
| FAIL        | At least one measurable assertion failed, or execution failed after setup. Inspect evidence.                                                                       |
| UNSUPPORTED | Native API unavailable, unrecognized API generation, no completed native paint, or the check requires human/AT verification. The reason distinguishes these cases. |
| NOT RUN     | No result has been collected.                                                                                                                                      |

A **DOM precondition PASS is not an accessibility PASS**. Browser JavaScript cannot generally read the platform accessibility tree, computed accessible names, screen-reader output or trusted Tab navigation. Manual observations are stored separately and never overwrite automated status. Synthetic keyboard events do not simulate browser Tab navigation.

### Geometry evidence

The controlled fixture uses a single solid rectangular button with no shadow or rounded corners. The engine reads canvas pixels and scans non-transparent alpha (>32/255), then maps the raster extent into viewport CSS coordinates. DOM bounds come from `getBoundingClientRect()`, not from the draw matrix. Tolerance is 2 CSS pixels to accommodate raster edge rounding.

The comparison reports separate x, y, width and height differences and their maximum. Rotation compares axis-aligned bounding boxes, not polygon overlap. This cannot detect all internal-shape errors. Clipping needs separate hit testing because a DOM bounding rectangle need not reflect clipping. Raster access failures, no pixels and draw failures cannot produce a geometry PASS.

Accessibility-tree bounds remain a **manual check** in V1. DOM geometry is labeled as a proxy throughout the interface and exported evidence. Geometry can agree while names, semantics or focus still fail.

The canvas backing store intentionally stays 560×280 for reproducible raster tests; CSS display size may vary. Scaling is explicitly normalized. This is not a high-DPI image-quality benchmark.

## Repository

```text
src/
  cases/index.js         Declarative cases and manual instructions
  core/capabilities.js  Native API detection
  core/geometry.js      Pure raster/coordinate comparison functions
  core/runner.js        Fixture lifecycle, native paint, evidence collection
  main.jsx              React laboratory UI
  styles.css            Responsive laboratory and fixture styles
 tests/                 Geometry and case-contract regression checks
 docs/                  Architecture, API status and contribution guide
```

Start simple: one Vite application, React and React DOM as the only runtime dependencies. Measurement logic, native browser fixtures and the React interface live in separate modules.

## Code quality

Run `npm run format` to format the source and documentation, `npm run format:check` to check formatting, and `npm run lint` to run ESLint. `npm run lint:fix` applies supported automatic fixes. Both CI and the Pages build require these checks to pass.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md), [test-case guide](docs/TEST-CASES.md), and [architecture](docs/ARCHITECTURE.md). Stable IDs, reproducible fixtures, honest evidence boundaries and accessible tooling matter more than a green score.

## Privacy

Reports remain in memory until exported. Reloading clears the session. JSON includes user agent, source URL, timestamps, measurements and manually entered notes. Review your report before attaching it to a public issue.

## License

[MIT](LICENSE).
