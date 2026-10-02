# MVP validation snapshot — 2026-10-02

- `npm test`: geometry extraction, coordinate normalization, mismatch/tolerance handling and registry-contract regression checks pass.
- `npm run build`: production static output builds successfully.
- Browser preview: app renders; Run all completes with 20 UNSUPPORTED results in a browser without the experimental API; playground and capability/setup views function.
- Inspected UI at desktop width. Responsive styles and mobile case selection are implemented, but a separate mobile-device run was not performed.
- Native HTML-in-Canvas, experimental-browser pixel synchronization, real Tab/focus rendering and assistive-technology behavior were **not verified** in this environment. These are explicit follow-up validation requirements, not claimed passes.
- Optional read-only WebMCP results registration is feature-detected; this browser did not expose a supported WebMCP context, so tool execution was not validated.

Run the same cases in a flag-enabled browser and attach exported evidence when reporting native behavior. A correct result may be FAIL: the laboratory is designed to surface platform/authoring mismatches.
