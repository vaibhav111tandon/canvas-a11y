import test from 'node:test';
import assert from 'node:assert/strict';
import { alphaBounds, toViewport, compareBounds } from '../src/core/geometry.js';
import { cases } from '../src/cases/index.js';
test('extracts independent raster extents and ignores transparent pixels', () => {
  const pixels = new Uint8ClampedArray(8 * 6 * 4);
  for (let y = 2; y < 5; y++) for (let x = 1; x < 5; x++) pixels[(y * 8 + x) * 4 + 3] = 255;
  assert.deepEqual(alphaBounds(pixels, 8, 6), { x: 1, y: 2, width: 4, height: 3 });
  assert.equal(alphaBounds(new Uint8ClampedArray(16), 2, 2), null);
});
test('normalizes bitmap size, viewport position and CSS scaling', () => {
  assert.deepEqual(
    toViewport(
      { x: 100, y: 50, width: 120, height: 48 },
      { x: 620, y: 400, width: 280, height: 140 },
      560,
      280,
    ),
    { x: 670, y: 425, width: 60, height: 24 },
  );
});
test('detects 200px semantic drift and accepts subpixel rounding', () => {
  const visual = { x: 820, y: 400, width: 120, height: 48 };
  assert.equal(compareBounds(visual, { ...visual, x: 620 }).status, 'FAIL');
  assert.equal(compareBounds(visual, { ...visual, x: 620 }).maxDelta, 200);
  assert.equal(compareBounds(visual, { ...visual, x: 820.75 }).status, 'PASS');
  assert.equal(compareBounds(null, visual).status, 'UNSUPPORTED');
  assert.equal(compareBounds(visual, { ...visual, width: 125 }).status, 'FAIL');
});
test('case registry has 20 unique permanent IDs and explicit expectations', () => {
  assert.equal(cases.length, 20);
  assert.equal(new Set(cases.map((c) => c.id)).size, 20);
  for (const c of cases) {
    assert.ok(c.expected && c.description && c.reference && c.revision);
    if (c.mode === 'manual') assert.ok(c.manual);
  }
});
