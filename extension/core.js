(() => {
  const normalizeUsername = (value) => {
    let name = String(value || '').trim();
    if (!name) return '';
    if (/^https?:\/\//i.test(name)) {
      const url = new URL(name);
      if (!['instagram.com', 'www.instagram.com'].includes(url.hostname) || url.pathname.split('/').filter(Boolean).length !== 1) {
        throw new Error('Use an Instagram username or profile link.');
      }
      name = url.pathname.split('/').filter(Boolean)[0] || '';
    }
    name = name.replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9._]{1,30}$/.test(name)) throw new Error('Enter a valid Instagram username (letters, numbers, dots or underscores).');
    return name;
  };
  const exactUsername = (element, username) => (element.innerText || element.textContent || '')
    .split('\n').some(line => line.trim().replace(/^@/, '').toLowerCase() === username);
  const settingsFrom = (data = {}) => {
    const source = Array.isArray(data.contacts) ? data.contacts : [data.favourite || ''];
    const contacts = Array.from({ length: 5 }, (_, i) => normalizeUsername(source[i] || ''));
    const defaultIndex = Number.isInteger(data.defaultIndex) && data.defaultIndex >= 0 && data.defaultIndex < 5 ? data.defaultIndex : 0;
    return { contacts, defaultIndex, quiet: data.quiet !== false };
  };
  globalThis.InstCore = { normalizeUsername, exactUsername, settingsFrom };
})();
