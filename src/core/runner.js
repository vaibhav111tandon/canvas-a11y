import { detectCapabilities } from './capabilities.js';
import { alphaBounds, toViewport, rectJSON, compareBounds } from './geometry.js';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(r));
let sequence = 0;
export function createSession(host, test, options = {}) {
  const capabilities = detectCapabilities(),
    prefix = `fixture-${++sequence}`;
  const canvas = document.createElement('canvas');
  canvas.width = 560;
  canvas.height = 280;
  canvas.className = 'test-canvas';
  canvas.setAttribute('aria-label', `${test.title} live fixture`);
  if (capabilities.generation === 'drawable') canvas.setAttribute('content', 'drawable');
  else canvas.setAttribute('layoutsubtree', '');
  const root = document.createElement('div');
  root.className = 'fixture';
  root.setAttribute('drawable', '');
  const content = {
    button: '<button>Delete</button>',
    name: '<button>Delete</button>',
    hidden: '<button hidden>Hidden action</button><span>Visible content</span>',
    label: '<button aria-label="Close dialog">×</button>',
    relationships: `<span id="${prefix}-name">Delete item</span><button aria-labelledby="${prefix}-name" aria-describedby="${prefix}-help">Delete</button><span id="${prefix}-help">This cannot be undone</span>`,
    multiple: '<button>First</button><button>Second</button><button>Third</button>',
    rtl: '<button dir="rtl" lang="ar">حذف العنصر</button>',
    nested:
      '<div class="nested-parent">Parent drawable<div drawable class="nested-child"><button>Delete</button></div></div>',
    structure:
      '<section aria-label="Actions"><h3>Actions</h3><ul><li>First item</li><li>Second item</li></ul><button>Delete</button></section>',
    disabled: '<button disabled>Delete</button>',
  };
  root.innerHTML = content[test.fixture] || content.button;
  // Draw the button itself for precise independent border-box/raster measurements.
  let drawable = ['button', 'name', 'label', 'rtl', 'disabled'].includes(test.fixture)
    ? root.firstElementChild
    : root;
  drawable.setAttribute('drawable', '');
  if (drawable !== root) canvas.append(drawable);
  else canvas.append(root);
  const target = canvas.querySelector('button');
  let disposed = false,
    paints = 0,
    lastError = null,
    activationCount = 0,
    lastMatrix = null;
  let position = {
    x: options.x ?? 170,
    y: options.y ?? 106,
    angle: options.angle ?? 0,
    scale: options.scale ?? 1,
  };
  if (test.id === 'transform') position = { x: 240, y: 80, angle: 18, scale: 1 };
  if (test.id === 'nested-transforms') position = { x: 200, y: 80, angle: 12, scale: 1.2 };
  canvas.addEventListener('click', (e) => {
    if (e.target.closest('button')) {
      activationCount++;
      options.onActivation?.(activationCount);
    }
  });
  host.replaceChildren(canvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  function paint() {
    if (disposed || !capabilities.supported) return;
    try {
      ctx.reset();
      if (!drawable.isConnected) {
        paints++;
        return;
      }
      ctx.translate(position.x, position.y);
      ctx.rotate((position.angle * Math.PI) / 180);
      ctx.scale(position.scale, position.scale);
      if (test.id === 'nested-transforms') {
        ctx.translate(32, 12);
        ctx.rotate((-7 * Math.PI) / 180);
      }
      if (test.id === 'clipping') {
        ctx.beginPath();
        ctx.rect(0, 0, 60, 48);
        ctx.clip();
      }
      lastMatrix = ctx.getTransform().toString();
      const matrix = ctx.drawElementImage(drawable, 0, 0);
      if (capabilities.generation === 'layoutsubtree') {
        if (!matrix || typeof matrix.toString !== 'function')
          throw new Error('Unrecognized legacy drawElementImage return value.');
        drawable.style.transformOrigin = '0 0';
        if (options.sync !== false) {
          const transform = matrix.toString();
          if (drawable.style.transform !== transform) drawable.style.transform = transform;
        }
      } else if (options.sync === false) {
        canvas.updateElementGeometry(drawable, {
          canvasTransform: new DOMMatrix().translate(position.x - 100, position.y),
        });
      }
      if (test.id === 'nested-drawable') {
        if (capabilities.generation !== 'drawable')
          throw new Error('Nested drawable case requires the content=drawable generation.');
        const child = canvas.querySelector('.nested-child');
        ctx.setTransform(1, 0, 0, 1, position.x + 20, position.y + 48);
        ctx.drawElementImage(child, 0, 0);
      }
      paints++;
    } catch (error) {
      lastError = `${error.name}: ${error.message}`;
    }
  }
  canvas.addEventListener('paint', paint);
  function request() {
    if (capabilities.requestPaint) canvas.requestPaint();
    else drawable.style.setProperty('--paint-tick', String(performance.now()));
  }
  async function settled() {
    const previous = paints;
    request();
    const deadline = performance.now() + 1800;
    while (!disposed && paints === previous && !lastError && performance.now() < deadline)
      await pause(30);
    await frame();
    return paints > previous;
  }
  function measure() {
    const visual = toViewport(
      alphaBounds(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        canvas.width,
        canvas.height,
      ),
      canvas.getBoundingClientRect(),
      canvas.width,
      canvas.height,
    );
    const dom = drawable.isConnected ? rectJSON(drawable.getBoundingClientRect()) : null;
    return {
      visual,
      dom,
      comparison: compareBounds(visual, dom, 2),
      coordinateSpace: 'viewport CSS pixels',
      canvasBackingSize: { width: canvas.width, height: canvas.height },
      canvasCSSBounds: rectJSON(canvas.getBoundingClientRect()),
      drawTransform: lastMatrix,
    };
  }
  async function run() {
    const start = performance.now(),
      checks = [];
    const add = (name, pass, details) =>
      checks.push({ name, status: pass ? 'PASS' : 'FAIL', details });
    const finish = (status, reason, geometry = null) => ({
      id: test.id,
      title: test.title,
      revision: test.revision,
      status,
      reason,
      checks,
      geometry,
      capabilities,
      paintCount: paints,
      elapsedMs: Math.round(performance.now() - start),
      timestamp: new Date().toISOString(),
      scope:
        test.mode === 'geometry'
          ? 'raster-vs-dom'
          : 'DOM preconditions; not accessibility-tree verification',
      manualRequired: test.manual || null,
      reference: test.reference,
    });
    if (!capabilities.supported)
      return finish(
        'UNSUPPORTED',
        'Native HTML-in-Canvas API unavailable or API generation unrecognized.',
      );
    if (test.id === 'nested-drawable' && capabilities.generation !== 'drawable')
      return finish('UNSUPPORTED', 'Nested drawable requires the newer API generation.');
    if (!(await settled()))
      return finish('UNSUPPORTED', lastError || 'No native paint event completed within 1800ms.');
    try {
      if (test.run) {
        await test.run({ canvas, target, drawable, check: add, measure, settled });
        return finish(
          checks.length && checks.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL',
          'Custom assertions completed.',
        );
      }
      if (test.mode === 'manual')
        return finish(
          'UNSUPPORTED',
          'Requires human verification; use the live fixture and manual instructions.',
        );
      if (test.mode === 'geometry' || test.mode === 'animation') {
        if (test.id === 'dynamic-geometry') {
          const before = measure();
          add('Initial geometry synchronized', before.comparison.status === 'PASS', before);
          position.x += 110;
          position.y -= 32;
          if (!(await settled()))
            return finish('UNSUPPORTED', lastError || 'Redraw did not complete.');
        }
        if (test.mode === 'animation') {
          const previous = document.activeElement;
          target.focus({ preventScroll: true });
          for (let i = 0; i < 12; i++) {
            position.x += 6;
            await settled();
          }
          add('Focus retained after animation', document.activeElement === target);
          previous?.focus({ preventScroll: true });
        }
        const geometry = measure();
        if (!geometry.visual)
          return finish(
            'UNSUPPORTED',
            'No readable raster pixels; geometry cannot be verified.',
            geometry,
          );
        add(
          'Raster and DOM bounds agree',
          geometry.comparison.status === 'PASS',
          geometry.comparison,
        );
        return finish(
          checks.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL',
          `Maximum bounds difference: ${geometry.comparison.maxDelta.toFixed(2)} CSS px.`,
          geometry,
        );
      }
      if (test.mode === 'focus') {
        const previous = document.activeElement;
        target.focus({ preventScroll: true });
        add('document.activeElement is button', document.activeElement === target);
        previous?.focus({ preventScroll: true });
      } else if (test.mode === 'disabled') {
        const previous = document.activeElement;
        target.focus({ preventScroll: true });
        target.click();
        add('Disabled control rejects focus', document.activeElement !== target);
        add('Disabled control rejects click', activationCount === 0);
        previous?.focus({ preventScroll: true });
      } else if (test.mode === 'removal') {
        drawable.remove();
        if (!(await settled()))
          return finish('UNSUPPORTED', lastError || 'Removal repaint did not complete.');
        add('Element disconnected', !drawable.isConnected);
        add('Canvas pixels cleared', !measure().visual);
      } else {
        switch (test.fixture) {
          case 'button':
            add(
              'Native button and text',
              target.tagName === 'BUTTON' && target.textContent === 'Delete',
            );
            break;
          case 'name':
            target.textContent = 'Delete item';
            await settled();
            add('Text updated', target.textContent === 'Delete item');
            break;
          case 'hidden':
            add('Hidden has no layout box', target.hidden && target.getClientRects().length === 0);
            break;
          case 'label':
            add('aria-label attribute', target.getAttribute('aria-label') === 'Close dialog');
            break;
          case 'relationships':
            for (const attr of ['aria-labelledby', 'aria-describedby']) {
              const id = target.getAttribute(attr);
              add(`${attr} resolves`, !!document.getElementById(id)?.textContent.trim());
            }
            break;
          case 'multiple':
            add(
              'Three enabled native buttons',
              canvas.querySelectorAll('button:not(:disabled)').length === 3,
            );
            break;
          case 'rtl':
            add('Computed RTL direction', getComputedStyle(target).direction === 'rtl');
            break;
        }
      }
      return finish(
        checks.length && checks.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL',
        'Automated DOM checks completed. Manual instructions cover browser accessibility exposure.',
      );
    } catch (error) {
      return finish('FAIL', `${error.name}: ${error.message}`);
    }
  }
  if (!capabilities.supported) {
    canvas.style.display = 'none';
    const notice = document.createElement('div');
    notice.className = 'unsupported-demo';
    notice.innerHTML =
      '<span class="demo-symbol">⊡</span><strong>Native canvas preview unavailable</strong><p>Enable the experimental API to render this test.<br/>The test definition and diagnostics remain available.</p>';
    host.append(notice);
  } else request();
  return {
    run,
    canvas,
    target,
    capabilities,
    measure,
    async update(next) {
      position = { ...position, ...next };
      await settled();
      return measure();
    },
    focus() {
      target?.focus({ preventScroll: true });
      request();
    },
    dispose() {
      disposed = true;
      canvas.removeEventListener('paint', paint);
      host.replaceChildren();
    },
  };
}
