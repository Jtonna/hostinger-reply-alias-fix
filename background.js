// Inject the content script into already-open Hostinger tabs on install/update/startup.
// content.js guards against double injection.
async function injectIntoOpenTabs() {
  let tabs = [];
  try { tabs = await chrome.tabs.query({ url: 'https://mail.hostinger.com/*' }); } catch (e) { return; }
  for (const tab of tabs) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: false }, files: ['content.js'] });
    } catch (e) { /* tab may be discarded or restricted */ }
  }
}

chrome.runtime.onInstalled.addListener(injectIntoOpenTabs);
chrome.runtime.onStartup.addListener(injectIntoOpenTabs);
