# Product

## Register

**Product** — authenticated app UI (dashboards, data tables, AI chat, admin). Design serves the task. The public landing page is the one brand surface and already carries the visual identity.

## Users & Purpose

Business operators and analysts across four sectors (Retail, Service, Education, Agriculture) log into **Insights Forge** to turn their uploaded operational data into dashboards, causal reasoning, what-if simulations, and AI recommendations. They are in a work session: reading numbers, comparing trends, acting on recommendations. The interface must read like a precise printed report, not a glowing terminal.

## Brand Personality

Editorial, precise, quiet. "A printed annual report that happens to be interactive." Authority through restraint — light weights, generous whitespace, rationed color.

## References

- **Ventriloc** (primary style reference, tokens in DESIGN.md): warm paper-white canvas, monochrome precision, single orange ember accent.
- Stripe / Linear / Plaid — monochrome interfaces where typography and whitespace do the heavy lifting; charts as editorial content.

## Anti-references

- The previous dark "Enterprise OS" theme of this app (near-black surfaces, cool blues) — explicitly retired.
- Glowing dashboards, neon data-viz, gradient CTAs, cards with shadows.

## Design Principles

1. **95% achromatic.** Ember Orange (#ff682c) appears only as functional punctuation: active indicators, chart highlights, link underlines. Never a filled CTA.
2. **Weight-400 headings** in the display face; hierarchy through size and space, not boldness.
3. **Depth via surface color** (white ↔ ash ↔ ivory), never box-shadow.
4. **Three-radius rhythm:** 0px buttons, asymmetric 6px 0 0 feature cards / 20px data cards, 200px nav pills.
5. **Frozen contract:** UI-only changes; API clients, hooks, and backend untouched.

## Accessibility

Body text ≥4.5:1 on its surface (Graphite #202020 / Steel #4d4d4d on white/ash pass). Keep jest-axe suites green. Respect prefers-reduced-motion.
