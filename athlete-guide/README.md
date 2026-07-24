# The Performance Act — Athlete Guide (PDF source)

Source files for **`ThePerformanceAct-AthleteGuide.pdf`** (in the repo root): a
compact, fully branded brochure for teenage athletes explaining what working
with a psychologist in sport actually involves.

This is a standalone print/share PDF — it is **not** linked from the website.

## Brand system

- **Colours:** Black `#000`, Yellow `#FFE500`, White / warm paper `#FAF8F2`
- **Type:** Oswald (headings, labels, numbers) · Inter (body) — both embedded
- **Voice & assets** pulled from the live site: logos, athlete photography
  (grayscale-treated), te reo Māori (kōrero, whānau, hauora, Ōtautahi), and the
  "Helping People Grow" / "The session ends. The growing doesn't." lines.

## How it's built

The PDF is rendered from `guide.html` with headless Chromium (via
`puppeteer-core`) at A4, full-bleed. All fonts and images are local, so the
output is deterministic.

```bash
# from this folder
npm i puppeteer-core            # uses the system Chromium
node render.js guide.html ThePerformanceAct-AthleteGuide.pdf
```

`render.js` points at a Chromium executable via `executablePath` — update that
path for your machine if needed.

## Editing

- Copy lives inline in `guide.html`, one `<section class="sheet">` per page.
- Reusable components (yellow heading block, `IN THE GYM` callout, stat band,
  comparison table, journey steps, Q&A, support lines, references) are defined
  once in the `<style>` block and reused — restyle there to restyle everywhere.
- To swap photography, drop new files into `assets/img/` (they're pre-converted
  to grayscale) and update the `background-image` / `<img>` references.
- Logos in `assets/logo/` come from `../images/` on the site.

## Assets

- `assets/fonts/` — Oswald & Inter (SIL Open Font License)
- `assets/img/` — `cover` (floodlit field), `bush` (divider), `jason`, `james`
- `assets/logo/` — `logo-vertical` (for dark backgrounds), `emblem` (icon mark)
