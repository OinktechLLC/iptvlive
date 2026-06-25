// Background service worker for FastVPN
chrome.runtime.onInstalled.addListener(() => {
  console.log('FastVPN installed');
});

chrome.proxy.settings.onChange.addListener((details) => {
  console.log('Proxy settings changed', details);
});