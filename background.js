// Handles domain exclusion and settings
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'getSettings') {
    chrome.storage.sync.get(['disabledDomains', 'enabled'], (data) => {
      sendResponse({
        disabledDomains: data.disabledDomains || [],
        enabled: data.enabled !== false
      });
    });
    return true;
  }
  if (msg.type === 'setSettings') {
    chrome.storage.sync.set({
      disabledDomains: msg.disabledDomains, enabled: msg.enabled }, () => {
      sendResponse({success: true});
    });
    return true;
  }
});
