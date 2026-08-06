# Activ Paisa

Instant personal loan landing page and application flow.

Static HTML/CSS/JS — **no build step, no dependencies, no framework.**
Total transferred weight is ~18 KB gzipped plus branding assets.

## Run

```bash
npm start                 # serves on http://localhost:8000
# or, without npm:
python3 -m http.server 8000
npx serve .
```

The site also opens directly from the filesystem (`open index.html`) — the scripts
are plain `<script>` tags rather than ES modules specifically so `file://` works.

## Test

```bash
npm test                  # 35 flow + validation assertions in headless Chrome
```

Drives the real application in an iframe: validation rejections, step transitions,
OTP masking, EMI arithmetic, and a check that no original-brand strings remain.
Exits non-zero on failure. Override the browser with `CHROME=/path/to/chrome`.

## Structure

```
index.html            landing page + the 5-step application modal
css/styles.css        design tokens + components (single stylesheet)
js/constants.js       brand, copy, partners, offers, validation rules, timings
js/app.js             flow state machine, validation, modal, carousels, odometer
assets/brand/         logo, favicons, OG image, hero illustration
tests/                integration suite + runner
```

The application flow lives in a native `<dialog>` opened by any **Check Offers**
button — that gives focus trapping, Esc-to-close and the backdrop for free.
`/#apply` deep-links straight into it.

Carousels are native CSS scroll-snap driven by arrow buttons; the hero amount
uses a CSS-transform odometer. No carousel or animation library.

## Brand

| Token | Value |
|---|---|
| Primary | `#1E6BFF` |
| Secondary | `#472A8F` |
| Background | `#F8FAFC` |
| Buttons | `linear-gradient(135deg, secondary, primary)` |

All tokens are CSS custom properties at the top of `css/styles.css`. Change them
there and the whole site follows.

## Demo build

This build is **front-end only** — no applicant data is transmitted or stored.
The OTP step accepts any 6 digits and offers are computed locally from the
declared income. Every place needing a real backend is marked `TODO:` in
`js/app.js`:

- submit the application (`formEmployment` handler)
- send / resend / verify the OTP
- fetch live partner offers

## Deploying

Serve the repository root as a static site. Before deploying, **delete the
`www.moneycontrolpay.com/`, `images.moneycontrol.com/` and
`www.googletagmanager.com/` directories** — they are the original captured page
and are not used by this site. See the TODO note in the handover.

Optional minification (nothing here requires it — gzip already does the work):

```bash
npx --yes esbuild js/app.js js/constants.js --minify --outdir=dist/js
npx --yes esbuild css/styles.css --minify --outdir=dist/css
```
