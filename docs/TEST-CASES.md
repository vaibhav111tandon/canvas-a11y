# Adding a test case

Add a `define(...)` entry to `src/cases/index.js`. Existing fixtures/modes let contributors add cases without touching React.

```js
// id, title, category, expected, fixture, mode, manual instructions
 define(
   'button-focus-regression',
   'Focus reaches the drawn button',
   'Focus',
   'Calling focus() sets document.activeElement to the drawn button.',
   'button',
   'focus'
 );
```

The helper expands to a declarative object:

```js
{
  id: 'button-focus-regression',
  title: 'Focus reaches the drawn button',
  category: 'Focus',
  description: '...',
  expected: '...',
  fixture: 'button',
  mode: 'focus',
  manual: '',
  reference: 'https://github.com/WICG/html-in-canvas#accessibility',
  revision: 1
}
```

Supported modes: `geometry`, `focus`, `disabled`, `removal`, `animation`, `dom`, `manual`. For bespoke assertions, add an optional `run: async ({ canvas, target, drawable, check, measure, settled }) => { ... }`. `check(name, condition, details)` stores an assertion. The custom runner executes after native setup and paint, and must produce at least one check. Never use it to manufacture browser support.

A new fixture belongs in `core/runner.js` for V1. Keep DOM construction confined there. The fixture is disposed between tests. No timers or global event listeners may survive disposal. A future extraction can give fixtures individual modules when this registry grows.

## Evidence contract

Each result includes stable ID/revision, timestamp, status/reason, checks, API capabilities, paint count, duration, reference and scope. Geometry results additionally contain raster/DOM bounds, canvas backing/CSS dimensions, draw matrix, coordinate space, deltas and tolerance. Manual observations include their own status, notes and timestamp.

## Guidelines

- IDs are permanent. Increment revision if expected behavior changes.
- Describe an observable expectation, not an implementation detail.
- Link to the upstream spec/explainer or relevant issue.
- Distinguish CSS clipping, DOM boxes, hit-test regions and accessibility bounds.
- Assert both before and after a dynamic mutation where meaningful.
- Test a known failure/negative control when adding geometry logic.
- Use `manual` for screen-reader output, accessibility-tree structure, trusted Tab behavior and visual focus verification until an external automation adapter exists.
- Include runtime requirements and manual instructions. Don't replace missing evidence with a PASS.
