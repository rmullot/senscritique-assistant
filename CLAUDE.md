# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file Tampermonkey userscript (`senscritique-wiki-autofill.user.js`) that adds a floating panel, toggleable from a top-bar icon, on every SensCritique page (`https://*.senscritique.com/*`). On wiki edit pages, it searches external sources (Steam, TMDB, Google Books) for a work, previews the result, and pre-fills the wiki form fields so the user can review before submitting manually — it never auto-submits/publishes anything. Elsewhere on the site it also adds a couple of small site-wide UX helpers (search dropdown "créer une fiche" button, "Ajouter à une liste" popup close-protection) unrelated to form filling.

There is no build system, package manager, or test suite — it's plain vanilla JS in an IIFE, loaded directly by Tampermonkey. To "run" it, install it via Tampermonkey (from the raw file) and visit a SensCritique wiki page.

## Architecture

Everything lives in `senscritique-wiki-autofill.user.js`, organized into numbered sections (see the comment banners):

1. **`FIELD_MAPS`** — per work-type (`jeuvideo`, `film`, `serie`, `livre`, `bd`) mapping of logical field names to CSS selectors (`#scwiki-*`) on the SensCritique wiki form. **Only `jeuvideo` has been verified against the real form**; the other types are best-guess based on SensCritique's usual `scwiki-` naming convention and need checking against a live form before trusting them.
2. **`FICHES`** — the in-memory data object per type, populated by search providers and consumed by `fillForm`.
3. **DOM utilities** — generic helpers for setting input values (via native setter + synthetic events, since React-controlled inputs ignore plain `.value =`), closing autocomplete dropdowns, and selecting `<option>`s by text.
   - Genres/plateformes are a special case: SensCritique renders them as several adjacent single `<select>` elements (not one `<select multiple>`). `findSiblingSlots` locates all sibling selects sharing the exact same option set as a reference select, and `fillGenreSlots` distributes values across them.
   - Dates are split day/month/year form fields; `fillDate` locates the day select by id prefix and finds month/year siblings by shared `name` prefix.
4. **`fillForm(type)`** — generic driver that walks `FIELD_MAPS[type]`, matching each entry against `FICHES[type]`, and fills the DOM.
5. **Search providers (`SEARCH_PROVIDERS`)** — per-type integration with an external metadata source, each exposing `search(term)` and `select(item)`:
   - `jeuvideo` → Steam store API (no key required)
   - `film` / `serie` → TMDB (requires a user-supplied API key, entered via the ⚙️ Options panel and stored in `localStorage`)
   - `livre` / `bd` → Google Books API (works without a key using a shared anonymous quota; an optional personal key can be entered via the ⚙️ Options panel and stored in `localStorage` for a higher quota). Google Books doesn't distinguish author roles, so `bd` results split authors into scénariste/dessinateur heuristically and flag the result for manual review.
   - Before running a provider search, `checkSensCritiqueExists` queries SensCritique's own internal GraphQL API (`apollo.senscritique.com`) to warn if the work may already exist on the site.
6. **Panel UI (`buildPanel`)** — builds the floating, draggable, minimizable panel and preview sidebar, and wires up all button/event handlers. State (position, minimized, visibility, TMDB/Google Books keys) persists via `localStorage`. The panel's light/dark theme is **not** user-toggleable: it always follows the site's own current theme (see `isSiteDarkTheme`/`isBackgroundDark` below), re-synced live via a `MutationObserver` on `<html>`/`<body>`. The header also carries ⭐/💡 links to the GitHub repo (star / issues).
7. **Add-to-list popup shield (`initAddToListPopupProtection`)** — SensCritique's own "Ajouter à une liste" popup closes on any outside click/hover, before the user can hit Enregistrer. Rather than intercepting the site's own close-detection JS (unreliable), a full-viewport "hole" overlay (`createAddToListShield`) is inserted around the popup's real bounding rect to physically absorb outside clicks. The popup root is found by walking up from its search input until an ancestor also contains the modal's close button (`[data-testid="modal-cross"]`), and repositioned on every detected DOM mutation since the popup's content (and even its DOM node) can grow/change after mount.
8. **Top-bar visibility toggle (`initTopBarToggle`)** — injects an icon just left of the site's notification bell to show/hide the floating panel (hidden by default on `senscritique.com`, visible by default on `old.senscritique.com`; overridable, persisted in `localStorage`). Its stroke color is read live from the bell icon (`getBellStrokeColor`) rather than hardcoded, so it matches the top bar regardless of theme.
9. **"Créer une fiche" button in the search dropdown (`initCreateFicheButton`)** — inserts a themed link into the site's own search-autocomplete dropdown (`[data-testid="autocomplete-results"]`), anchored right after the "filtres" block (found via `data-testid`, not the generated CSS class names, which aren't stable across deploys) and re-verified on every mutation since React can reorder the dropdown's children.

Theme detection shared by several of the above (`isSiteDarkTheme`/`isBackgroundDark` and the bell-based variant) exists because `<body>`'s own `background-color` is usually transparent on this site — computing luminance from it is unreliable. Prefer walking up to the first ancestor with an actually-opaque background, or reading the bell icon's live stroke color, over trusting `<body>` directly.

### Adding a new work type or fixing a field mapping

- Add/adjust the entry in `FIELD_MAPS` (selector) and `FICHES` (default data shape) for the type.
- If wiring a new search provider, add an entry to `SEARCH_PROVIDERS` with `search`/`select`, and a `@connect` directive in the userscript header for any new external host.
- Field mappings other than `jeuvideo` are unverified — when editing them, open a real wiki form of that type and check ids via the browser inspector rather than assuming the selector is correct.

### Network access

All external requests use `GM_xmlhttpRequest` (via `gmGet`/`gmGetBlob`/`gmPostJson` wrappers) rather than `fetch`, since Tampermonkey's grant model requires it for cross-origin calls. Any new external host must be added to the `@connect` list in the userscript header or the request will be blocked.

The userscript header also sets `@downloadURL`/`@updateURL` to the raw GitHub URL of `senscritique-wiki-autofill.user.js` on `main`, so Tampermonkey can auto-check for updates once installed. **Do not bump `@version` yourself** — the repo owner manages that bump on their own; leave the field untouched when making changes.
