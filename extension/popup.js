const input = document.querySelector('#favourite');
const status = document.querySelector('#status');
const share = document.querySelector('#share');
const showError = error => { status.textContent = error.message; };
(async () => {
  const { favourite = '' } = await chrome.storage.local.get('favourite');
  input.value = favourite;
  input.disabled = false;
  document.querySelector('#save').disabled = false;
  share.disabled = !favourite;
  if (favourite) share.textContent = `Send to @${favourite}`;
  const commands = await chrome.commands.getAll();
  document.querySelector('#shortcut').textContent = commands.find(c => c.name === 'share-to-favourite')?.shortcut || 'No shortcut assigned';
})().catch(showError);
document.querySelector('#settings').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const favourite = InstCore.normalizeUsername(input.value);
    await chrome.storage.local.set({ favourite });
    input.value = favourite;
    share.disabled = !favourite;
    share.textContent = favourite ? `Send to @${favourite}` : 'Send current reel / post';
    status.textContent = favourite ? `Saved @${favourite}. Ready to share.` : 'Favourite cleared.';
  } catch (error) { showError(error); }
});
share.addEventListener('click', async () => {
  share.disabled = true;
  status.textContent = 'Sending…';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https:\/\/(www\.)?instagram\.com\//.test(tab.url || '')) throw new Error('Open a reel/post on Instagram first.');
    let result;
    try { result = await chrome.tabs.sendMessage(tab.id, { type: 'inst-share' }); }
    catch { throw new Error('Reload your Instagram tab, then try again.'); }
    status.textContent = result?.ok ? 'Sent ✓' : (result?.error || 'Could not share. Try again.');
  } catch (error) { showError(error); }
  finally { share.disabled = false; }
});
document.querySelector('#shortcuts').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
