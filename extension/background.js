chrome.commands.onCommand.addListener(async (command, tab) => {
  const slot = /^share-contact-([1-5])$/.exec(command);
  const actions = { 'share-to-favourite': 'inst-share', 'pick-contact': 'inst-picker', 'share-with-message': 'inst-compose' };
  const type = slot ? 'inst-share' : actions[command];
  if (!type) return;
  try {
    if (!tab?.id) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https:\/\/(www\.)?instagram\.com\//.test(tab.url || '')) return;
    await chrome.tabs.sendMessage(tab.id, slot ? { type, slot: Number(slot[1]) - 1 } : { type });
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
