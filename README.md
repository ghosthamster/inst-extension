<p align="center"><img src="assets/logo.png" width="128" height="128" alt="Inst Quick Share — paper plane with a heart"></p>

# Inst · Quick Share

Send Instagram reels and posts to your favourite people with shortcuts, a quick contact picker, and optional messages.

Save up to **five contacts**, choose a default, and press **Option + Shift + S** on macOS or **Alt + Shift + S** on Windows/Linux. The extension operates Instagram’s own Share dialog. Use the picker to choose someone else, or add a message before sending.

**Direct shortcuts and choosing a contact in the picker send immediately, without a confirmation prompt.** Instagram’s dialog and search can take a few seconds to finish.

This is an independent, experimental project, not affiliated with Instagram or Meta. The maintainer has successfully tested the original direct-sharing flow in Brave with a real Instagram account. The newer picker, caption, and quiet-mode flows are covered by fixture tests but have not yet been confirmed against a live account. Automated tests separately cover the sharing flow using simulated Instagram pages; they do not verify live message delivery.

## Install in Brave

No build, Node.js installation, or developer account is needed to use the extension.

1. Download this repository using **Code → Download ZIP** and extract it, or clone it:

   ```sh
   git clone https://github.com/ghosthamster/inst-extension.git
   ```

2. Open `brave://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the repository’s **`extension`** folder, which contains `manifest.json`.
4. Pin **Inst · Quick Share** using Brave’s extensions menu.
5. Open Instagram, sign in normally, and reload any tabs that were open before installation.

The extension is loaded locally; it is not a browser-store installation and does not update automatically. After pulling or downloading an update, click **Reload** on its card in `brave://extensions`, then reload Instagram.

## Set your contacts

1. Click the extension’s toolbar icon.
2. Fill up to five numbered contact slots. Each accepts `some.person`, `@some.person`, or `https://www.instagram.com/some.person/`.
3. Select the radio button beside the contact you want as your default.
4. Click **Save contacts**. Empty a slot and save to remove it; empty all slots to clear your contacts.

Upgrading from version 1.0? Your existing favourite appears in slot 1 automatically. Contacts and the default apply to this Brave profile, even when you switch Instagram accounts.

## Shortcuts and sharing

| Action | macOS default | Windows/Linux default |
| --- | --- | --- |
| Send to default contact | Option + Shift + S | Alt + Shift + S |
| Open contact picker | Option + Shift + P | Alt + Shift + P |
| Add a message | Option + Shift + M | Alt + Shift + M |
| Send directly to slots 1–5 | Assign in Brave | Assign in Brave |

Open `brave://extensions/shortcuts` to change keys or assign an individual key to each **contact slot**. Slot shortcuts follow the slot number when you change its username. The popup shows the actual assignments. If a default key is already taken, assign an available combination.

Brave/Chromium limits extensions to four suggested shortcuts, so individual contact shortcuts are initially unassigned. You can assign them manually. See the [Commands API documentation](https://developer.chrome.com/docs/extensions/reference/api/commands).

**Quick picker:** open it while viewing a reel/post, then press **1–5** or click a contact to send. Empty slots are omitted. **Esc** or **Cancel** closes it without sending; Tab moves between buttons.

**Optional message:** open the composer, choose a saved contact, type your note, and click **Send** or press **Cmd/Ctrl + Enter**. Plain Enter adds a new line. Esc cancels. An empty message shares only the reel/post. Messages are limited to 1,000 characters and drafts are not saved. If Instagram’s message field cannot be found or does not retain your text, the extension stops without sending.

The popup also provides **Send to default**, **Choose contact**, and **Add message** buttons. Picker and composer open on the Instagram page and close the toolbar popup.

**Quiet sharing** is enabled by default: Instagram’s Share dialog is hidden while the operation runs, with a small Sending/Sent status instead. On errors the dialog is revealed so you can inspect it. Disable Quiet sharing in the popup and save to watch the process. Existing Share dialogs are left alone; close them before retrying.

## Requirements and limitations

- **Instagram’s interface must be in English.** The extension looks for English Share and Send labels.
- **Brave is the tested browser**, on macOS. Other Chromium browsers and operating systems have not been verified.
- The most visible video’s post is preferred. An open post dialog takes priority. Keep the intended reel visible before sharing.
- Contact matching checks full text lines in each search result, so the username can appear above or below the display name. It requires exactly one result with an exact, case-insensitive match and does not use partial matches. This is visible-text matching, not identity verification through an Instagram API; a display name identical to the saved username can also match.
- Repeated shortcuts during an in-progress share are ignored. Already-open Share dialogs, ambiguous matches, extra selected recipients, and ambiguous or disabled Send buttons stop the operation.
- The extension considers the Share dialog closing after Send to be completion. It does not verify delivery in the recipient’s inbox. If completion is uncertain, **check your DM before retrying**; sending is never automatically retried.
- Instagram can change its page structure and break this integration. Login challenges, account restrictions, and Instagram errors must be handled on Instagram itself.

## Privacy and permissions

The extension has no backend, analytics, advertising, or remote executable code. Its runtime has no third-party dependencies.

| Access | Purpose |
| --- | --- |
| `storage` | Saves contact usernames, the default slot, and the quiet-mode setting in `chrome.storage.local`; the extension does not sync them. |
| `activeTab` | Lets the toolbar action or keyboard command address the active Instagram tab. |
| Content scripts on `https://instagram.com/*` and `https://www.instagram.com/*` | Reads visible page elements and operates Instagram’s Share dialog. No content scripts run on other sites. |

The extension does not read passwords, export cookies, or store message history. The selected username is entered into Instagram’s search box when you share, and Instagram handles the resulting message through your existing signed-in session. Caption text is passed to Instagram only when you choose Send; the extension does not persist it. Clearing the contacts removes the saved usernames; uninstalling removes the extension’s local storage.

## Troubleshooting

| Problem | What to try |
| --- | --- |
| Shortcut does nothing | Check the assignment at `brave://extensions/shortcuts`, activate the Instagram tab, and reload it. |
| Reload badge (`↻`) | Reload Instagram after installing or reloading the extension. |
| No Share button found | Open a reel/post, keep it visible, and use Instagram’s English interface. |
| Contact not found or ambiguous | Check the exact username. Close any Share dialog before retrying. |
| Send did not finish | Check the DM first to avoid a duplicate, then resolve any Instagram error. |

When reporting a bug, include Brave’s version, operating system, Instagram interface language, and the error message. Remove usernames, DM content, cookies, and other personal details from screenshots or logs.

## Development

Prerequisites: **Node.js 20+**, npm, an installed Brave browser, and **Python 3** for ZIP packaging.

```sh
npm ci
npm test
npm run test:browser
npm run package
```

The browser suite defaults to Brave’s standard macOS installation path. On another installation, point `BRAVE_PATH` at its executable:

```sh
BRAVE_PATH="/path/to/brave" npm run test:browser
```

Tests use a temporary browser profile and intercept Instagram page requests with local fixtures. They cover username parsing, shortcut dispatch, legacy settings, multiple contacts, shortcut routing, picker cancellation, optional messages, quiet-mode recovery, reel selection, and failure conditions without using your real login or sending real DMs. They verify shortcut registration and message dispatch, not a physical operating-system keypress.

Packaging creates `dist/inst-quick-share.zip` with `manifest.json` at its root. Extract it before using **Load unpacked**. Only extension runtime files are included; tests and development dependencies are excluded.

```text
extension/           Manifest, service worker, content script, and popup
scripts/package.py   Runtime-only ZIP packaging
tests/               Unit tests and isolated Brave integration tests
```

`private: true` in `package.json` prevents accidental npm publication; it does not control the GitHub repository’s visibility.

## License

[MIT](LICENSE) © 2026 ghosthamster.
