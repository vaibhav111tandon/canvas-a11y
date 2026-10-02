# HTML-in-Canvas API status

Verified 2026-10-02 against primary sources. This is a dated snapshot, not a promise of cross-browser availability.

- [WICG living explainer](https://github.com/WICG/html-in-canvas): current proposal describes `content="drawable"`, explicit `drawable` descendants, `paint`, `requestPaint()`, `drawElementImage()`, `updateElementGeometry()` and `clearElementGeometry()`.
- [WHATWG HTML PR #11588](https://github.com/whatwg/html/pull/11588): open at verification, with revisions still being made in late September 2026. Do not describe this as a finished, interoperable standard.
- [Chrome Origin Trial article](https://developer.chrome.com/blog/html-in-canvas-origin-trial), updated May 19 2026: documents the older `layoutsubtree` generation, a matrix returned from `drawElementImage()` and applying that matrix to CSS. It lists a historical trial window, which must not be assumed to remain active today.

## Adapters

| Detection                                                                        | Behavior                                                                                                                     |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Canvas `content` plus `updateElementGeometry()` and context `drawElementImage()` | Set `content="drawable"`; set descendant `drawable`; rely on native automatic geometry updates.                              |
| Canvas `layoutSubtree` plus context `drawElementImage()`                         | Set `layoutsubtree`; draw in the paint event; apply the returned matrix to the direct child's CSS transform with origin 0 0. |
| Neither recognized shape                                                         | UNSUPPORTED. Do not guess from user-agent version.                                                                           |

The modern playground negative control deliberately assigns incorrect geometry after drawing. The legacy negative control omits applying the returned draw transform. These are intentionally incorrect author behaviors, not browser conformance failures.

## Scope

V1 exercises the main-thread 2D API. WebGL, WebGPU, OffscreenCanvas, captureElementImage and worker geometry delivery are outside its scope. Nested drawable is offered only for the newer generation. API presence is not proof of functional support: the runner waits for an actual native paint and records failures/timeouts.

The browser support page exposes local detected features and user agent. It avoids a hard-coded browser/version support matrix that would age poorly.
