# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file Tampermonkey userscript (`senscritique-wiki-autofill.user.js`) that adds a floating panel to SensCritique wiki edit pages (`https://*.senscritique.com/*`). It searches external sources (Steam, TMDB) for a work, previews the result, and pre-fills the wiki form fields so the user can review before submitting manually — it never auto-submits/publishes anything.

There is no build system, package manager, or test suite — it's plain vanilla JS in an IIFE, loaded directly by Tampermonkey. To "run" it, install it via Tampermonkey (from the raw file) and visit a SensCritique wiki page.

## Architecture

Everything lives in `senscritique-wiki-autofill.user.js`, organized into numbered sections (see the comment banners):

1. **`FIELD_MAPS`** — per work-type (`jeuvideo`, `film`, `serie`, `livre`, `bd`, `album`) mapping of logical field names to CSS selectors (`#scwiki-*`) on the SensCritique wiki form. **Only `jeuvideo` has been verified against the real form**; the other types are best-guess based on SensCritique's usual `scwiki-` naming convention and need checking against a live form before trusting them.
2. **`FICHES`** — the in-memory data object per type, populated by search providers and consumed by `fillForm`.
3. **DOM utilities** — generic helpers for setting input values (via native setter + synthetic events, since React-controlled inputs ignore plain `.value =`), closing autocomplete dropdowns, and selecting `<option>`s by text.
   - Genres/plateformes are a special case: SensCritique renders them as several adjacent single `<select>` elements (not one `<select multiple>`). `findSiblingSlots` locates all sibling selects sharing the exact same option set as a reference select, and `fillGenreSlots` distributes values across them.
   - Dates are split day/month/year form fields; `fillDate` locates the day select by id prefix and finds month/year siblings by shared `name` prefix.
4. **`fillForm(type)`** — generic driver that walks `FIELD_MAPS[type]`, matching each entry against `FICHES[type]`, and fills the DOM.
5. **Search providers (`SEARCH_PROVIDERS`)** — per-type integration with an external metadata source, each exposing `search(term)` and `select(item)`:
   - `jeuvideo` → Steam store API (no key required)
   - `film` / `serie` → TMDB (requires a user-supplied API key, entered via the ⚙️ Options panel and stored in `localStorage`)
   - `livre`, `bd`, `album` have no provider wired up yet (fillable manually only)
   - Before running a provider search, `checkSensCritiqueExists` queries SensCritique's own internal GraphQL API (`apollo.senscritique.com`) to warn if the work may already exist on the site.
6. **Panel UI (`buildPanel`)** — builds the floating, draggable, minimizable, light/dark-themed panel and preview sidebar, and wires up all button/event handlers. State (theme, position, minimized, TMDB key) persists via `localStorage`.

### Adding a new work type or fixing a field mapping

- Add/adjust the entry in `FIELD_MAPS` (selector) and `FICHES` (default data shape) for the type.
- If wiring a new search provider, add an entry to `SEARCH_PROVIDERS` with `search`/`select`, and a `@connect` directive in the userscript header for any new external host.
- Field mappings other than `jeuvideo` are unverified — when editing them, open a real wiki form of that type and check ids via the browser inspector rather than assuming the selector is correct.

### Network access

All external requests use `GM_xmlhttpRequest` (via `gmGet`/`gmGetBlob`/`gmPostJson` wrappers) rather than `fetch`, since Tampermonkey's grant model requires it for cross-origin calls. Any new external host must be added to the `@connect` list in the userscript header or the request will be blocked.
