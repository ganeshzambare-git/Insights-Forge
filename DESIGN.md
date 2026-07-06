# Design — Ventriloc system

> Editorial data observatory on warm paper — a single orange ember punctuating monochrome precision. Theme: **light** (dark mode retired).

## Colors

| Token | Value | Role |
|---|---|---|
| `--color-graphite` | `#202020` | Primary text, headings, primary (dark-filled) buttons |
| `--color-canvas-white` | `#ffffff` | Page canvas, data cards |
| `--color-ash` | `#efefef` | Card/section surface, nav pill container |
| `--color-fog` | `#f5f5f5` | Nested/secondary surfaces |
| `--color-ivory` | `#ebe6dd` | Warm featured-block wash |
| `--color-steel` | `#4d4d4d` | Secondary body text |
| `--color-slate` | `#828282` | Muted/tertiary text |
| `--color-mist` | `#e8e8e8` | Hairline dividers |
| `--color-ember-orange` | `#ff682c` | Accent punctuation ONLY (links, chart highlight, active dot). Never a CTA fill |
| `--color-brass` | `#816729` | Secondary accent: chart strokes, tag text |

shadcn HSL mapping lives in `frontend/src/index.css` (`--background` = white, `--card` = ash, `--primary` = graphite, `--accent-ember`, etc.).

## Typography

- **Display face:** PolySans → substitute **DM Sans** (loaded in `index.html`), weight **400 only**, letter-spacing -0.02em. Headings, nav items, button labels.
- **Body face:** **Inter** — body, labels, captions, data. 400 for prose, 500/600 for UI labels.
- Scale: caption 14/1.43 · subheading 18/1.25 · heading 32/1.19/-0.64px · heading-lg 40/1.2/-0.8px · display 66/0.91/-1.32px.
- Never bold the display face.

## Shape & Space

- Radii: buttons **0px** · data cards **20px** · standard cards 8px · asymmetric feature card **6px 0 0 0** · nav pills **200px** · tags 20px.
- No box-shadows anywhere; depth = surface contrast (white → ash → fog → ivory).
- Base unit 4px; element gap 20px; section gap 80px; card padding 40px (24px in dense app panels); page max-width 1200px.

## Components

- **Primary button:** Graphite fill, white text, 0px radius, display face 16px/400.
- **Ghost button:** transparent, 1px graphite border, 0 radius.
- **Nav:** pill container (ash bg, 200px radius) with text links in graphite; active item marked with an ember dot or underline, not a filled block.
- **Charts (ECharts via `BaseChart`):** light theme; series stroke #ff682c (primary) + #816729 (secondary), remaining series in grays; axis text Slate; splitLines Mist; no dark backgrounds.
- **Links:** ember 1px underline offset 2–3px, used sparingly.

## Do / Don't

Do keep pages 95% achromatic; alternate white/ash bands instead of dividers; -0.02em tracking on all display-face text.
Don't bold display headings; don't use ember as button fill; don't add shadows; don't introduce blue/green chroma (semantic error/success states in forms are the only exception, kept muted).
