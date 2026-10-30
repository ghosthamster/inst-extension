# Inst · Quick Share

Send the Instagram reel or post you are viewing to one saved contact with a keyboard shortcut.

Save a username once, then press **Option + Shift + S** on macOS or **Alt + Shift + S** on Windows/Linux. The extension opens Instagram’s Share dialog, searches for your contact, and clicks Send. You can also share from the extension popup.

**Sharing starts immediately, without a confirmation prompt.** Instagram’s dialog and search can take a few seconds to finish.

This is an independent, experimental project, not affiliated with Instagram or Meta. It has been tested in Brave with simulated Instagram pages; live-account delivery has not been verified by the automated tests.

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

## Set your favourite and share

1. Click the extension’s toolbar icon.
2. Enter an Instagram username such as `some.person`. `@some.person` and `https://www.instagram.com/some.person/` also work.
3. Click **Save favourite**.
4. Open the intended reel or post and press the shortcut while that Instagram tab is active.
5. Watch the on-page status for completion or an error.

To change the contact, save a different username. To clear it, empty the field and save. The saved contact applies to this Brave profile, including when you switch Instagram accounts within that profile.

To change the shortcut, open `brave://extensions/shortcuts`. If another extension uses the default key, assign an available combination there. The popup shows the currently assigned shortcut.

## Requirements and limitations

- **Instagram’s interface must be in English.** The extension looks for English Share and Send labels.
- **Brave is the tested browser**, on macOS. Other Chromium browsers and operating systems have not been verified.
- The most visible video’s post is preferred. An open post dialog takes priority. Keep the intended reel visible before sharing.
- Contact matching expects Instagram search results to show the username on the first nonempty text line. It requires one exact, case-insensitive match; it does not use partial matches. This is DOM-based matching, not verification through an Instagram API.
- Repeated shortcuts during an in-progress share are ignored. Already-open Share dialogs, ambiguous matches, extra selected recipients, and ambiguous or disabled Send buttons stop the operation.
- The extension considers the Share dialog closing after Send to be completion. It does not verify delivery in the recipient’s inbox. If completion is uncertain, **check your DM before retrying**; sending is never automatically retried.
- Instagram can change its page structure and break this integration. Login challenges, account restrictions, and Instagram errors must be handled on Instagram itself.

## Privacy and permissions

The extension has no backend, analytics, advertising, or remote executable code. Its runtime has no third-party dependencies.

| Access | Purpose |
| --- | --- |
| `storage` | Saves the favourite username in `chrome.storage.local` in your Brave profile; it is not synced by the extension. |
| `activeTab` | Lets the toolbar action or keyboard command address the active Instagram tab. |
| Content scripts on `https://instagram.com/*` and `https://www.instagram.com/*` | Reads visible page elements and operates Instagram’s Share dialog. No content scripts run on other sites. |

The extension does not read passwords, export cookies, or store message history. Your saved username is entered into Instagram’s search box when you share, and Instagram handles the resulting message through your existing signed-in session. Clearing the favourite removes the saved value; uninstalling removes the extension’s local storage.

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

Tests use a temporary browser profile and intercept Instagram page requests with local fixtures. They cover username parsing, shortcut dispatch, popup persistence, reel selection, sharing, and failure conditions without using your real login or sending real DMs. They verify shortcut registration and message dispatch, not a physical operating-system keypress.

Packaging creates `dist/inst-quick-share.zip` with `manifest.json` at its root. Extract it before using **Load unpacked**. Only extension runtime files are included; tests and development dependencies are excluded.

```text
extension/           Manifest, service worker, content script, and popup
scripts/package.py   Runtime-only ZIP packaging
tests/               Unit tests and isolated Brave integration tests
```

`private: true` in `package.json` prevents accidental npm publication; it does not control the GitHub repository’s visibility.

## License

An open-source license has not yet been selected. Public repository visibility alone does not grant an open-source license.
