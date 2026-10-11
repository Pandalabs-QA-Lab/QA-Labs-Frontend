import test from 'node:test';
import assert from 'node:assert/strict';
import { safePageUrl, serverUrl, rectangle } from './core.mjs';
test('captured URL excludes credentials, query secrets and fragments', () => {
  assert.equal(safePageUrl('https://user:password@example.com/cart?token=secret#customer'), 'https://example.com/cart');
  assert.throws(() => safePageUrl('chrome://settings'));
});
test('API destinations use HTTPS or local development only', () => {
  assert.equal(serverUrl('http://localhost:4000/api/'), 'http://localhost:4000/api');
  assert.equal(serverUrl('https://api.example.com/qa/api'), 'https://api.example.com/qa/api');
  for (const value of ['http://remote.example/api', 'https://user:password@example.com/api', 'https://example.com/?key=secret', 'javascript:alert(1)']) assert.throws(() => serverUrl(value));
});
test('redaction rectangles normalize reverse dragging and clip to image bounds', () => {
  assert.deepEqual(rectangle({ x: 90, y: 80 }, { x: -10, y: 20 }, 100, 50), { x: 0, y: 20, width: 90, height: 30 });
});
