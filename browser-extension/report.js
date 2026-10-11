import { safePageUrl, serverUrl, rectangle } from './core.mjs';
const $ = (id) => document.getElementById(id);
const captureId = new URL(location.href).searchParams.get('capture');
let session = null, apiBase = '', appBase = '', mode = 'redact', start = null;
let bug = null, attachment = null, lockedProject = '', uploadBlob = null;
const edits = [];
const canvas = $('canvas'), context = canvas.getContext('2d'), image = new Image();
const notify = (message) => { $('status').textContent = message; };
function draw(preview) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (image.complete && image.naturalWidth) context.drawImage(image, 0, 0);
  for (const edit of [...edits, ...(preview ? [preview] : [])]) {
    if (edit.mode === 'redact') { context.fillStyle = '#000'; context.fillRect(edit.x, edit.y, edit.width, edit.height); }
    else { context.strokeStyle = '#ed2861'; context.lineWidth = Math.max(4, canvas.width / 300); context.strokeRect(edit.x, edit.y, edit.width, edit.height); }
  }
}
function point(event) {
  const bounds = canvas.getBoundingClientRect();
  return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height };
}
canvas.addEventListener('pointerdown', event => {
  if (bug) return;
  start = point(event); canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => { if (start) draw({ ...rectangle(start, point(event), canvas.width, canvas.height), mode }); });
canvas.addEventListener('pointerup', event => {
  if (!start) return;
  const edit = { ...rectangle(start, point(event), canvas.width, canvas.height), mode };
  if (edit.width > 2 && edit.height > 2) edits.push(edit);
  start = null; $('reviewed').checked = false; draw();
});
canvas.addEventListener('pointercancel', () => { start = null; draw(); });
for (const tool of ['highlight', 'redact']) $(tool).addEventListener('click', () => {
  mode = tool; for (const id of ['highlight', 'redact']) $(id).setAttribute('aria-pressed', String(id === tool));
});
$('redact').setAttribute('aria-pressed', 'true');
$('undo').addEventListener('click', () => { if (!bug) { edits.pop(); draw(); $('reviewed').checked = false; } });
function options(id, rows, prompt, label = row => row.name || row.title) {
  $(id).replaceChildren(new Option(prompt, ''), ...rows.map(row => new Option(label(row), row.id)));
}
async function request(path, { method = 'GET', body } = {}) {
  const headers = session?.token ? { Authorization: `Bearer ${session.token}` } : {};
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(apiBase + path, { method, headers, credentials: 'omit', signal: AbortSignal.timeout(30000), body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) { session = null; $('connection').open = true; }
    throw new Error(data.error || 'QA Lab could not complete the request.');
  }
  return data;
}
async function workspaces() {
  const rows = await request('/auth/workspaces');
  options('workspace', rows.filter(row => ['QA_LEAD', 'TESTER'].includes(row.role)), 'Choose a workspace');
  $('fields').disabled = false;
  notify(rows.some(row => ['QA_LEAD', 'TESTER'].includes(row.role)) ? 'Connected. Choose your workspace and project.' : 'Ask your workspace admin for Tester access before reporting bugs.');
}
$('login').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter; button.disabled = true;
  try {
    const nextApi = serverUrl($('apiUrl').value), nextApp = serverUrl($('appUrl').value);
    if (bug && (nextApi !== apiBase || nextApp !== appBase)) throw new Error('Finish this report before changing servers.');
    // Called directly from the user gesture; access is limited to the chosen API origin.
    const granted = await chrome.permissions.request({ origins: [new URL(nextApi).origin + '/*'] });
    if (!granted) throw new Error('Allow access to your QA Lab API to connect.');
    apiBase = nextApi; appBase = nextApp;
    session = null;
    const login = await request('/auth/login', { method: 'POST', body: { email: $('email').value, password: $('password').value } });
    $('password').value = '';
    if (login.user.mustChangePassword) throw new Error('Change your temporary password in QA Lab first, then sign in here.');
    session = login;
    await chrome.storage.session.set({ connection: { session, apiBase, appBase } });
    await chrome.storage.local.set({ apiBase, appBase });
    await workspaces(); $('connection').open = false;
  } catch (error) { notify(error.message); } finally { button.disabled = false; $('password').value = ''; }
});
$('signout').addEventListener('click', async () => {
  session = null; await chrome.storage.session.remove('connection'); $('fields').disabled = true; $('connection').open = true; notify('Signed out.');
});
$('workspace').addEventListener('change', async () => {
  options('project', [], 'Choose a project'); options('testCase', [], 'No linked test case');
  if (!$('workspace').value) return;
  $('fields').disabled = true;
  try {
    session = await request(`/auth/workspaces/${encodeURIComponent($('workspace').value)}/select`, { method: 'POST' });
    await chrome.storage.session.set({ connection: { session, apiBase, appBase } });
    options('project', await request('/projects'), 'Choose a project');
  } catch (error) { notify(error.message); }
  finally { $('fields').disabled = !session; }
});
$('project').addEventListener('change', async () => {
  options('testCase', [], 'No linked test case');
  if (!$('project').value) return;
  $('fields').disabled = true;
  try { options('testCase', await request(`/projects/${encodeURIComponent($('project').value)}/test-cases`), 'No linked test case', row => `${row.testCaseId || row.sourceTestCaseId || ''} ${row.title}`); }
  catch (error) { notify(error.message); }
  finally { $('fields').disabled = !session; }
});
$('includeScreenshot').addEventListener('change', () => { canvas.hidden = !$('includeScreenshot').checked; $('reviewed').checked = false; });
$('report').addEventListener('input', event => { if (event.target !== $('reviewed')) $('reviewed').checked = false; });
$('report').addEventListener('submit', async event => {
  event.preventDefault();
  if (!session || !$('reviewed').checked) return;
  $('submit').disabled = true; $('fields').disabled = true;
  try {
    if (!bug) {
      lockedProject = $('project').value;
      uploadBlob = null;
      if ($('includeScreenshot').checked && image.naturalWidth) {
        draw(); uploadBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!uploadBlob || uploadBlob.size > 15 * 1024 * 1024) throw new Error('Screenshot exceeds 15 MB. Uncheck Include screenshot to report without it.');
      }
      bug = await request(`/projects/${encodeURIComponent(lockedProject)}/bugs`, { method: 'POST', body: {
        title: $('title').value.trim(), stepsToReproduce: $('steps').value, expected: $('expected').value, actual: $('actual').value,
        severity: $('severity').value, build: $('build').value, linkedTestCaseId: $('testCase').value || null,
        description: `Captured page: ${safePageUrl($('pageUrl').value)}`, environment: $('environment').value, tags: ['browser-capture'],
      } });
    }
    // Remember completed stages in this report tab. Retrying an attachment failure reuses the saved bug.
    if (uploadBlob && !attachment) {
      const form = new FormData(); form.append('projectId', lockedProject); form.append('bugId', bug.id); form.append('file', uploadBlob, 'qa-lab-capture.png');
      attachment = await request(`/projects/${encodeURIComponent(lockedProject)}/attachments`, { method: 'POST', body: form });
    }
    if (attachment) await request(`/projects/${encodeURIComponent(lockedProject)}/bugs/${bug.id}`, { method: 'PATCH', body: {
      evidenceLinks: [{ id: attachment.id, attachmentId: attachment.id, url: attachment.url, label: 'Browser capture screenshot', addedAt: new Date().toISOString() }],
    } });
    notify(`${bug.sourceBugId || 'Bug'} saved${attachment ? ' with its screenshot' : ''}.`);
    $('openBug').href = `${appBase}/#/projects/${encodeURIComponent(lockedProject)}/bugs?preview=${encodeURIComponent(bug.id)}`;
    $('openBug').hidden = false; $('submit').hidden = true;
    if (captureId) await chrome.storage.session.remove(captureId);
  } catch (error) {
    notify(bug ? `Bug already saved. Evidence could not finish: ${error.message} Retry to attach evidence to the same bug.` : `${error.message} Your report is still here. If the server timed out, check the bug tracker before retrying.`);
    $('submit').textContent = bug ? 'Retry evidence upload' : 'Submit bug';
    $('fields').disabled = false;
    if (bug) for (const element of $('fields').querySelectorAll('input,select,textarea,button')) if (element !== $('submit')) element.disabled = true;
  } finally { $('submit').disabled = false; }
});
async function init() {
  if (typeof chrome === 'undefined' || !chrome.storage?.session) {
    notify('Preview only. Load the browser-extension folder as an unpacked Chrome or Edge extension to capture and submit bugs.');
    $('login').querySelector('button[type=submit]').disabled = true;
    $('signout').disabled = true;
    return;
  }
  const saved = await chrome.storage.local.get(['apiBase', 'appBase']);
  if (saved.apiBase) $('apiUrl').value = saved.apiBase;
  if (saved.appBase) $('appUrl').value = saved.appBase;
  const memory = await chrome.storage.session.get([captureId || 'captureError', 'connection']);
  const capture = captureId && memory[captureId];
  if (capture) {
    $('title').value = capture.details.title ? `Issue on ${capture.details.title}`.slice(0, 240) : '';
    $('pageUrl').value = safePageUrl(capture.details.url);
    $('environment').value = `Browser: ${capture.details.browser}\nViewport: ${capture.details.viewport}; pixel ratio: ${capture.details.pixelRatio}\nLanguage: ${capture.details.language}\nCaptured: ${capture.capturedAt}`;
    image.onload = () => { canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; draw(); };
    image.src = capture.screenshot;
  } else { notify(memory.captureError || 'This capture has expired. Click the extension on the page you want to report.'); $('includeScreenshot').checked = false; canvas.hidden = true; }
  if (memory.connection) {
    ({ session, apiBase, appBase } = memory.connection);
    try { await request('/auth/me'); await workspaces(); $('connection').open = false; }
    catch (error) { notify(error.message); }
  }
}
init().catch(error => notify(error.message));
