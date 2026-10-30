(() => {
  const choose = (settings, withMessage) => new Promise(resolve => {
    const previousFocus = document.activeElement;
    const host = document.createElement('div');
    host.id = 'inst-contact-picker';
    Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '2147483647' });
    const shadow = host.attachShadow({ mode: 'open' });
    // Static markup only. Contact names and draft text are assigned as text/values.
    shadow.innerHTML = `<style>
      :host{color-scheme:dark}.backdrop{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#08091499;font:14px/1.5 system-ui;color:#f5f4fa}
      .card{box-sizing:border-box;width:min(420px,90vw);max-height:85vh;overflow:auto;padding:24px;border:1px solid #484252;border-radius:20px;background:#171923;box-shadow:0 20px 80px #0008}
      h2{margin:0 0 5px;font-size:21px}p{margin:0 0 16px;color:#b8b4c7}button,select,textarea{box-sizing:border-box;font:inherit;color:inherit;border:1px solid #4c465a;border-radius:10px;background:#262733}
      button{cursor:pointer;padding:11px 14px}button:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid #c4b5fd;outline-offset:2px}.contact{width:100%;display:flex;gap:14px;text-align:left;margin:8px 0}.number{color:#c4b5fd}
      select,textarea{width:100%;padding:10px;margin:6px 0 14px}textarea{min-height:110px;resize:vertical}label{font-weight:600}.actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}.send{background:#c4b5fd;color:#201738;border-color:#c4b5fd}.hint{font-size:12px;margin-top:10px}
    </style><div class="backdrop"><div class="card" role="dialog" aria-modal="true" aria-labelledby="title"><h2 id="title"></h2><p id="intro"></p><div id="body"></div><div class="actions"><button id="cancel" type="button">Cancel</button></div></div></div>`;
    const body = shadow.querySelector('#body');
    shadow.querySelector('#title').textContent = withMessage ? 'Share with a message' : 'Send to…';
    shadow.querySelector('#intro').textContent = withMessage ? 'Choose a contact and add a note to this reel/post.' : 'Press a contact’s number to send immediately. Esc cancels.';
    let finished = false;
    const close = result => {
      if (finished) return;
      finished = true;
      document.removeEventListener('keydown', onKey, true);
      host.remove();
      previousFocus?.focus?.({ preventScroll: true });
      resolve(result);
    };
    const contacts = settings.contacts.map((username, slot) => ({ username, slot })).filter(c => c.username);
    let select, message;
    const submit = () => close({ slot: Number(select.value), message: message.value.trim() });
    if (withMessage) {
      const label = document.createElement('label'); label.textContent = 'Recipient'; label.htmlFor = 'recipient';
      select = document.createElement('select'); select.id = 'recipient';
      for (const contact of contacts) {
        const option = document.createElement('option'); option.value = contact.slot; option.textContent = `@${contact.username}`; select.append(option);
      }
      if (settings.contacts[settings.defaultIndex]) select.value = settings.defaultIndex;
      const note = document.createElement('label'); note.textContent = 'Message (optional)'; note.htmlFor = 'message';
      message = document.createElement('textarea'); message.id = 'message'; message.maxLength = 1000; message.placeholder = 'Thought you’d like this…';
      const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'Cmd/Ctrl + Enter to send · Esc to cancel. Drafts are not saved.';
      body.append(label, select, note, message, hint);
      const send = document.createElement('button'); send.id = 'send'; send.className = 'send'; send.textContent = 'Send'; send.onclick = submit;
      shadow.querySelector('.actions').append(send);
    } else {
      for (const contact of contacts) {
        const button = document.createElement('button'); button.className = 'contact'; button.dataset.slot = contact.slot;
        const number = document.createElement('span'); number.className = 'number'; number.textContent = contact.slot + 1;
        const name = document.createElement('span'); name.textContent = `@${contact.username}`;
        button.append(number, name); button.onclick = () => close({ slot: contact.slot, message: '' }); body.append(button);
      }
    }
    const onKey = event => {
      event.stopImmediatePropagation();
      if (event.key === 'Escape') { event.preventDefault(); close(null); return; }
      if (withMessage && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submit(); return; }
      if (!withMessage && /^[1-5]$/.test(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault(); const slot = Number(event.key) - 1;
        if (settings.contacts[slot]) close({ slot, message: '' });
      }
      if (event.key === 'Tab') {
        const elements = [...shadow.querySelectorAll('button, select, textarea')];
        const index = elements.indexOf(shadow.activeElement);
        event.preventDefault(); elements[(index + (event.shiftKey ? -1 : 1) + elements.length) % elements.length].focus();
      }
    };
    shadow.querySelector('#cancel').onclick = () => close(null);
    shadow.querySelector('.backdrop').onclick = event => { if (event.target.classList.contains('backdrop')) close(null); };
    host.addEventListener('wheel', event => event.stopPropagation());
    document.documentElement.append(host);
    document.addEventListener('keydown', onKey, true);
    (message || body.querySelector('button')).focus();
  });
  globalThis.InstChooser = { choose };
})();
