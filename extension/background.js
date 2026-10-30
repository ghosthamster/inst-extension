chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'share-to-favourite') return;
  try {
    if (!tab?.id) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https:\/\/(www\.)?instagram\.com\//.test(tab.url || '')) return;
    await chrome.tabs.sendMessage(tab.id, { type: 'inst-share' });
  } catch {
    // Existing tabs need a reload after installing/reloading the extension.
    await chrome.action.setBadgeText({ text: '↻' });
    await chrome.action.setTitle({ title: 'Reload Instagram to enable Inst Quick Share' });
  }
});
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'inst-ready' && sender.tab) {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Inst · Quick Share' });
  }
});
