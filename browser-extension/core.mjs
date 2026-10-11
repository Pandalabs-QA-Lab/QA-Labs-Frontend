export function safePageUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an HTTP or HTTPS page URL.');
  url.username = ''; url.password = ''; url.search = ''; url.hash = '';
  return url.href;
}
export function serverUrl(value) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Use HTTPS, or HTTP on localhost, without credentials or query parameters.');
  return url.href.replace(/\/$/, '');
}
export function rectangle(start, end, width, height) {
  const clamp = (value, max) => Math.min(max, Math.max(0, value));
  const x = clamp(Math.min(start.x, end.x), width), y = clamp(Math.min(start.y, end.y), height);
  return { x, y, width: clamp(Math.max(start.x, end.x), width) - x, height: clamp(Math.max(start.y, end.y), height) - y };
}
