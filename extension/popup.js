const status = document.querySelector('#status');
const share = document.querySelector('#share');
const picker = document.querySelector('#picker');
const compose = document.querySelector('#compose');
let saved;
const showError = error => { status.textContent = error.message; };
const refresh = () => {
  const favourite = saved.contacts[saved.defaultIndex];
  share.disabled = !favourite;
  share.textContent = favourite ? `Send to @${favourite}` : 'Set a default contact';
  picker.disabled = compose.disabled = !saved.contacts.some(Boolean);
};
(async () => {
  saved = InstCore.settingsFrom(await chrome.storage.local.get(null));
  const commands = await chrome.commands.getAll();
  const shortcut = name => commands.find(c => c.name === name)?.shortcut || 'Unassigned';
  saved.contacts.forEach((username, i) => {
    const row = document.createElement('div');
    row.className = 'contact';
    const radio = document.createElement('input');
    radio.type = 'radio'; radio.name = 'default'; radio.value = i; radio.checked = saved.defaultIndex === i;
    radio.setAttribute('aria-label', `Use slot ${i + 1} as default`);
    const label = document.createElement('label');
    label.textContent = `${i + 1}`;
    const input = document.createElement('input');
    input.id = i === 0 ? 'favourite' : `contact-${i + 1}`;
    input.setAttribute('aria-label', `Contact ${i + 1} username`);
    input.className = 'username'; input.value = username; input.placeholder = '@username';
    input.autocomplete = 'off'; input.spellcheck = false;
    label.htmlFor = input.id;
    const key = document.createElement('small'); key.textContent = shortcut(`share-contact-${i + 1}`);
    const body = document.createElement('div'); body.append(label, input, key);
    row.append(radio, body); document.querySelector('#contacts').append(row);
  });
  document.querySelector('#quiet').checked = saved.quiet;
  document.querySelector('#fields').disabled = false;
  document.querySelector('#shortcut').textContent = shortcut('share-to-favourite');
  document.querySelector('#picker-key').textContent = shortcut('pick-contact');
  document.querySelector('#compose-key').textContent = shortcut('share-with-message');
  refresh();
})().catch(showError);
document.querySelector('#settings').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const contacts = [...document.querySelectorAll('.username')].map(el => InstCore.normalizeUsername(el.value));
    const names = contacts.filter(Boolean);
    if (new Set(names).size !== names.length) throw new Error('Each contact should appear in only one slot.');
    const defaultIndex = Number(document.querySelector('[name="default"]:checked').value);
    if (names.length && !contacts[defaultIndex]) throw new Error('Choose a filled contact slot as your default.');
    saved = { contacts, defaultIndex, quiet: document.querySelector('#quiet').checked };
    await chrome.storage.local.set({ ...saved, favourite: contacts[defaultIndex] });
    document.querySelectorAll('.username').forEach((el, i) => { el.value = contacts[i]; });
    refresh(); status.textContent = names.length ? 'Contacts saved. Ready to share.' : 'Contacts cleared.';
  } catch (error) { showError(error); }
});
const act = async type => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https:\/\/(www\.)?instagram\.com\//.test(tab.url || '')) throw new Error('Open a reel/post on Instagram first.');
    status.textContent = type === 'inst-share' ? 'Sending…' : 'Choose on the Instagram page…';
    share.disabled = picker.disabled = compose.disabled = true;
    // The page owns the operation; closing this popup will not cancel it.
    const result = await chrome.tabs.sendMessage(tab.id, { type, detached: type !== 'inst-share' }).catch(() => { throw new Error('Reload Instagram, then try again.'); });
    if (result?.opened) { window.close(); return; }
    status.textContent = result?.cancelled ? 'Cancelled.' : result?.ok ? 'Sent ✓' : result?.error || 'Could not share.';
  } catch (error) { showError(error); }
  finally { refresh(); }
};
share.addEventListener('click', () => act('inst-share'));
picker.addEventListener('click', () => act('inst-picker'));
compose.addEventListener('click', () => act('inst-compose'));
document.querySelector('#shortcuts').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
