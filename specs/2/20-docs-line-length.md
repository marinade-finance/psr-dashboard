---
status: planned
---

# Docs hygiene: ≤120-char line length

**Why:** CLAUDE.md wisdom rule says prose lines ≤120 chars; several root docs
and `public/docs/GUIDE.md` have lines 200+ chars (the "Data Sources" table,
participation-requirements bullet, long-URL rows).

**Scope:** `public/docs/GUIDE.md`, `SCREENS.md`, `VISUALS.md`,
`ARCHITECTURE.md`, `README.md`, `CLAUDE.md`, `bugs.md`.

**Rules:** wrap prose at ≤120 chars; don't break mid-link or mid-codespan.
Markdown tables with long URLs: use footnote references or accept the table as
the documented exception. Don't reformat code blocks.
