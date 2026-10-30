(() => {
  if (globalThis.__instQuickShare) return;
  globalThis.__instQuickShare = true;
  const { normalizeUsername, exactUsername } = InstCore;
  let busy = false;
  let toastTimer;
  let toastNode;
  const toast = (message, duration = 4000) => {
    if (!toastNode?.isConnected) {
      const host = document.createElement('div');
      host.id = 'inst-quick-share-status';
      Object.assign(host.style, { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: '2147483647', pointerEvents: 'none' });
      const shadow = host.attachShadow({ mode: 'open' });
      toastNode = document.createElement('div');
      toastNode.setAttribute('role', 'status');
      Object.assign(toastNode.style, { background: '#171923', color: '#fff', border: '1px solid #454454', borderRadius: '14px', padding: '12px 18px', maxWidth: 'min(440px,80vw)', font: '500 14px system-ui', boxShadow: '0 8px 32px #0005' });
      shadow.append(toastNode);
      document.documentElement.append(host);
    }
    clearTimeout(toastTimer);
    toastNode.textContent = message;
    toastNode.hidden = false;
    toastTimer = setTimeout(() => { toastNode.hidden = true; }, duration);
  };
  const visible = element => {
    const r = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const shareDialog = () => [...document.querySelectorAll('input[name="queryBox"]')]
    .find(visible)?.closest('[role="dialog"]');
  const waitFor = async (fn, ms) => {
    const end = Date.now() + ms;
    do {
      const result = fn();
      if (result) return result;
      await new Promise(resolve => setTimeout(resolve, 100));
    } while (Date.now() < end);
    return null;
  };
  const findShareButton = () => {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
    const scope = dialogs.at(-1) || document;
    const buttons = [...scope.querySelectorAll('svg[aria-label="Share"], svg[aria-label="Share Post"], button[aria-label="Share"], [role="button"][aria-label="Share"]')]
      .map(el => el.closest('button, [role="button"]')).filter(el => el && visible(el));
    const unique = [...new Set(buttons)];
    if (unique.length < 2) return unique[0];
    const videos = [...scope.querySelectorAll('video')].filter(visible);
    const area = el => { const r = el.getBoundingClientRect(); return (Math.min(r.bottom, innerHeight) - Math.max(0, r.top)) * (Math.min(r.right, innerWidth) - Math.max(0, r.left)); };
    const video = videos.sort((a, b) => area(b) - area(a))[0];
    if (video) {
      // Prefer a post container that owns exactly one share button.
      for (let parent = video.parentElement; parent && parent !== scope && parent !== document.body; parent = parent.parentElement) {
        const local = unique.filter(button => parent.contains(button));
        if (local.length === 1) return local[0];
        if (local.length > 1) break;
      }
    }
    const mid = el => { const r = el.getBoundingClientRect(); return (r.top + r.bottom) / 2; };
    const target = video ? mid(video) : innerHeight / 2;
    return unique.sort((a, b) => Math.abs(mid(a) - target) - Math.abs(mid(b) - target))[0];
  };
  const selected = dialog => [...dialog.querySelectorAll('[role="option"][aria-selected="true"], [role="checkbox"][aria-checked="true"], input[type="checkbox"]:checked')];
  const runShare = async username => {
    if (shareDialog()) throw new Error('Close the current Share dialog, then try again.');
    const button = findShareButton();
    if (!button) throw new Error('No visible reel/post Share button. Open a reel and try again (Instagram UI must be in English).');
    button.click();
    const dialog = await waitFor(shareDialog, 5000);
    if (!dialog) throw new Error('Instagram’s Share dialog did not open.');
    if (selected(dialog).length) throw new Error('Share already has selected recipients. Close it and try again.');
    const input = dialog.querySelector('input[name="queryBox"]');
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, username);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const option = await waitFor(() => {
      const matches = [...dialog.querySelectorAll('[role="option"]')].filter(el => visible(el) && exactUsername(el, username));
      return matches.length === 1 ? matches[0] : null;
    }, 8000);
    if (!option) throw new Error(`Could not uniquely find @${username}. Nothing sent.`);
    if (!dialog.isConnected || selected(dialog).length) throw new Error('Share dialog changed. Close it and try again.');
    option.click();
    const send = await waitFor(() => {
      if (!dialog.isConnected) return null;
      const buttons = [...dialog.querySelectorAll('button, [role="button"]')].filter(el =>
        visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true' &&
        /^(send|share)$/i.test((el.innerText || el.getAttribute('aria-label') || '').trim()));
      return buttons.length === 1 ? buttons[0] : null;
    }, 4000);
    if (!send) throw new Error('Could not identify an enabled Send button. Nothing sent.');
    const otherSelected = selected(dialog).some(el => !option.contains(el) && el !== option);
    if (otherSelected) throw new Error('Another recipient is selected. Nothing sent.');
    send.click();
    if (!await waitFor(() => !dialog.isConnected || !visible(dialog), 6000)) {
      throw new Error('Instagram did not confirm completion. Check your DM before retrying.');
    }
  };
  const share = async () => {
    if (busy) return { ok: false, error: 'A share is already in progress.' };
    busy = true;
    try {
      const { favourite = '' } = await chrome.storage.local.get('favourite');
      const username = normalizeUsername(favourite);
      if (!username) throw new Error('Set your favourite username in the Inst extension popup first.');
      toast(`Sending to @${username}…`, 30000);
      await runShare(username);
      toast(`Sent to @${username} ✓`);
      return { ok: true };
    } catch (error) {
      toast(error.message, 6500);
      return { ok: false, error: error.message };
    } finally { busy = false; }
  };
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.type !== 'inst-share') return;
    share().then(respond);
    return true;
  });
  chrome.runtime.sendMessage({ type: 'inst-ready' }).catch(() => {});
})();
