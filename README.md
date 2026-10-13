# Wild Roofing Review Kit

Team tool for asking every finished Wild Roofing job for an honest Google review: QR code, text and email scripts, follow-up reminders, reply templates, the review rules and a shared log of who was asked.

Served at **https://reviews.wildroofing.com** through GitHub Pages.

## Password

The whole kit is locked with the team password. `index.html` only holds a password screen and the kit in encrypted form (AES-256-GCM, key from the password via PBKDF2-SHA-256, 600,000 rounds). The password is not stored anywhere in this repo. "Keep this device unlocked" saves the key on that device only; **Lock the kit on this device** at the bottom of the kit clears it.

## Shared review log

Every ask logged on any device goes into one log, so the office and the field see the same list.

- The log is `review-log.enc.json` on the `logs` branch, locked with the same password. The site itself deploys from `main`, so saving the log never rebuilds the site.
- The kit saves through the GitHub API with a fine-grained token that the owner pastes in once (Review log → Connect the shared log). The token is locked with the password and saved as `kit-config.enc.json` on the `logs` branch, so every device picks it up.
- Token settings: Only select repositories → `wild-roofing-review-kit`; Permissions → Contents: Read and write. When it expires, the kit asks the owner for a new one. Changes made meanwhile wait on the device and save after reconnecting.
- Changes made offline wait on the device and save when it's back online. If two people save at the same moment, the second save retries on top of the newer log.
- **Export CSV** in the Review log downloads a spreadsheet copy at any time. The log moves with this repo if the site is ever hosted somewhere else.

## Files

- `index.html`: password screen plus the locked kit.
- `logo.png`, `apple-touch-icon.png`, `icon-192.png`, `site.webmanifest`: logo and Home Screen icons.
- `CNAME`: custom domain for GitHub Pages.
- `tools/kit.mjs`: locks and unlocks the kit for editing.

## Editing the kit

```sh
KIT_PASSWORD='…' node tools/kit.mjs unpack   # writes kit/kit.css, kit/kit.html, kit/kit.js
# edit the files in kit/
KIT_PASSWORD='…' node tools/kit.mjs pack     # locks them back into index.html
```

`kit/` is in `.gitignore`; never commit it, because this repo is public. Commit only the re-locked `index.html`.

Changing the password means re-locking the page, the shared log and the saved token together, so plan it as its own change.

Texts open in the Quo mobile app (`openphone://message` link) with the customer's number and message filled in, sent from whichever Quo line is selected in the app. Email opens the phone's mail app. The page is marked `noindex`, so search engines won't list it.
