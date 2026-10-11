chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!/^https?:\/\//.test(tab.url || '')) throw new Error('Open a website before capturing. Browser settings and extension pages cannot be captured.');
    const [{ result: details }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({ title: document.title, url: location.href, viewport: `${innerWidth} × ${innerHeight}`, pixelRatio: devicePixelRatio, browser: navigator.userAgent, language: navigator.language }),
    });
    const [active] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
    if (active?.id !== tab.id) throw new Error('The active page changed. Click capture again on the page you want.');
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    const [afterCapture] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
    if (afterCapture?.id !== tab.id || afterCapture.url !== tab.url) throw new Error('The active page changed during capture. Please capture again.');
    const id = crypto.randomUUID();
    // Captures and login sessions stay in memory, not persistent/synced storage.
    await chrome.storage.session.set({ [id]: { details, screenshot, capturedAt: new Date().toISOString() } });
    await chrome.tabs.create({ url: chrome.runtime.getURL(`report.html?capture=${id}`) });
  } catch (error) {
    await chrome.storage.session.set({ captureError: error.message });
    await chrome.tabs.create({ url: chrome.runtime.getURL('report.html') });
  }
});
