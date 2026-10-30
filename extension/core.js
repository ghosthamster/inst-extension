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
    .split('\n').map(line => line.trim()).filter(Boolean)[0]?.replace(/^@/, '').toLowerCase() === username;
  globalThis.InstCore = { normalizeUsername, exactUsername };
})();
