# Wild Roofing Review Kit

Field kit for asking every finished Wild Roofing job for an honest Google review: QR code, text and email scripts, follow-up reminders, reply templates and the review rules.

Served at **https://reviews.wildroofing.com** through GitHub Pages once Pages and DNS are set up.

## Files

- `index.html` is the whole kit in one page. Each phone keeps its own review log in its browser; nothing is stored on a server.
- `CNAME` sets the custom domain for GitHub Pages.
- `site.webmanifest`, `apple-touch-icon.png` and `icon-192.png` let the page install to a phone's Home Screen.

## Setup

1. Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`.
2. GoDaddy DNS for wildroofing.com: add a `CNAME` record, name `reviews`, value `thegreatestsage.github.io`.
3. Back in Settings → Pages, tick **Enforce HTTPS** once it becomes available.

The page is public but marked `noindex`, so search engines won't list it.
