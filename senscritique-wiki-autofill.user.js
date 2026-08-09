// ==UserScript==
// @name         SensCritique Wiki Autofill
// @namespace    senscritique-wiki-assistant
// @version      1.0
// @description  Panneau flottant multi-types (thème clair/sombre) pour pré-remplir les fiches wiki SensCritique
// @downloadURL  https://github.com/rmullot/senscritique-assistant/blob/main/senscritique-wiki-autofill.user.js
// @updateURL    https://github.com/rmullot/senscritique-assistant/blob/main/senscritique-wiki-autofill.user.js
// @match        https://*.senscritique.com/*
// @grant        GM_xmlhttpRequest
// @connect      store.steampowered.com
// @connect      cdn.akamai.steamstatic.com
// @connect      shared.akamai.steamstatic.com
// @connect      www.senscritique.com
// @connect      apollo.senscritique.com
// @connect      api.themoviedb.org
// @connect      image.tmdb.org
// ==/UserScript==

// -------------------------------------------------------------------
// CONFORMITÉ TMDB (https://www.themoviedb.org/api-terms-of-use) :
// - Ce script est un outil personnel gratuit et non commercial. Aucune
//   monétisation, revente ou usage commercial n'est fait des données/
//   images TMDB (une clé d'API commerciale est requise pour cela et
//   n'est pas utilisée ici).
// - L'attribution TMDB obligatoire (texte exact exigé + logo officiel
//   non modifié, moins proéminent que la marque de ce script) est
//   affichée en permanence dans le panneau (footer #sc-footer), jamais
//   masquée dans un sous-menu.
// - Aucun contenu TMDB n'est mis en cache au-delà de la session en
//   cours : seule la clé d'API saisie par l'utilisateur est mémorisée
//   (localStorage), jamais les données/images renvoyées par l'API.
//
// STEAM — deux APIs distinctes existent chez Valve :
// - La Steam Web API officielle (documentée, clé signée, conditions
//   publiées sur steamcommunity.com/dev/apiterms) N'EST PAS celle
//   utilisée ici.
// - Ce script utilise la "Storefront API" (store.steampowered.com/api/
//   storesearch, /api/appdetails) : l'API interne non documentée du
//   client et du site boutique Steam. Elle n'est couverte par aucune
//   condition d'utilisation publiée par Valve — usage toléré en
//   pratique par de nombreux projets tiers connus, mais sans garantie
//   de stabilité ni de disponibilité (peut être limitée en débit,
//   modifiée ou bloquée sans préavis). Usage ici strictement personnel,
//   en lecture seule, à faible volume.
//
// SENSCRITIQUE — contrairement à TMDB et Steam, SensCritique ne publie
// aucune API ni conditions d'utilisation développeur. Ce script appelle
// leur API GraphQL interne (apollo.senscritique.com) avec la même clé
// que leur propre frontend utilise pour la recherche anonyme (voir
// findSensCritiqueApiKey() plus bas — détectée dynamiquement depuis le
// code de la page plutôt que codée en dur, pour rester à jour si
// SensCritique la fait tourner). Cet usage :
// - reste en lecture seule (aucune donnée n'est modifiée sur leurs
//   serveurs), strictement personnel et à faible volume ;
// - sert uniquement à vérifier qu'une fiche n'existe pas déjà avant
//   d'en préparer une nouvelle (usage cohérent avec l'objectif du site) ;
// - ne se substitue jamais à la publication, qui reste 100% manuelle
//   par l'utilisateur connecté via l'interface officielle du site ;
// - peut néanmoins être considéré comme un accès non autorisé à une
//   API interne au regard des CGU générales de SensCritique (non
//   consultables publiquement au moment de la rédaction — leur
//   robots.txt bloque l'accès automatisé, y compris pour simple
//   lecture). En cas de doute, contacter SensCritique directement.
// -------------------------------------------------------------------

(function () {
  'use strict';

  // ---------------------------------------------------------------
  // 1. Mapping des champs par type d'œuvre.
  //    IMPORTANT : seul le mapping "jeuvideo" a été vérifié sur le
  //    formulaire réel. Les autres (film, livre, serie, album, bd)
  //    sont des estimations à partir des conventions habituelles de
  //    SensCritique (préfixes scwiki-) — ouvre une fiche de ce type
  //    et vérifie/ajuste les id via l'inspecteur si besoin.
  // ---------------------------------------------------------------
  const FIELD_MAPS = {
    jeuvideo: {
      label: 'Jeu vidéo',
      categorie: '#scwiki-category',
      titreOriginal: '#scwiki-originaltitle',
      developpeurs: '#scwiki-developers',
      editeurs: '#scwiki-publishers',
      synopsis: '#scwiki-storyline',
      genres: '#scwiki-genres',
      plateformes: '#scwiki-gamesystems',
      dateSortiePrefix: 'scwiki-releasedate',
      dateSortieUSPrefix: 'scwiki-releasedateus',
      dateSortieJPPrefix: 'scwiki-releasedatejp',
      dateOriginePrefix: 'scwiki-originalreleasedate',
      trailerVO: '#scwiki-trailervo',
      trailerVF: '#scwiki-trailervf',
    },
    film: {
      label: 'Film',
      titreOriginal: '#scwiki-originaltitle',
      realisateurs: '#scwiki-directors',
      scenaristes: '#scwiki-writers',
      synopsis: '#scwiki-storyline',
      genres: '#scwiki-genres',
      duree: '#scwiki-runtime',
      dateSortiePrefix: 'scwiki-releasedate',
      trailerVO: '#scwiki-trailervo',
      trailerVF: '#scwiki-trailervf',
    },
    serie: {
      label: 'Série TV',
      categorie: '#scwiki-category',
      titreOriginal: '#scwiki-originaltitle',
      createurs: '#scwiki-creators',
      synopsis: '#scwiki-storyline',
      genres: '#scwiki-genres',
      nbSaisons: '#scwiki-numberofseasons',
      acteurs: '#scwiki-actors',
      producteurs: '#scwiki-producers',
      scenaristes: '#scwiki-writers',
      chaineOrigine: '#scwiki-originalchannel',
      statutProduction: '#scwiki-productionstatus',
      pays: '#scwiki-country',
      duree: '#scwiki-length',
      dateSortiePrefix: 'scwiki-originalrun',
      dateSortieFRPrefix: 'scwiki-frenchoriginalrun',
      trailerVO: '#scwiki-trailervo',
      trailerVF: '#scwiki-trailervf',
    },
    livre: {
      label: 'Livre',
      titreOriginal: '#scwiki-originaltitle',
      auteurs: '#scwiki-authors',
      editeurs: '#scwiki-publishers',
      synopsis: '#scwiki-storyline',
      genres: '#scwiki-genres',
      nbPages: '#scwiki-pages',
      dateSortiePrefix: 'scwiki-releasedate',
    },
    bd: {
      label: 'BD / Manga',
      titreOriginal: '#scwiki-originaltitle',
      auteurs: '#scwiki-authors',
      dessinateurs: '#scwiki-illustrators',
      editeurs: '#scwiki-publishers',
      synopsis: '#scwiki-storyline',
      genres: '#scwiki-genres',
      dateSortiePrefix: 'scwiki-releasedate',
    },
    album: {
      label: 'Album musique',
      titreOriginal: '#scwiki-originaltitle',
      artistes: '#scwiki-artists',
      label_musique: '#scwiki-label',
      synopsis: '#scwiki-storyline',
      genres: '#scwiki-genres',
      dateSortiePrefix: 'scwiki-releasedate',
    },
  };

  // ---------------------------------------------------------------
  // 2. Données de la fiche courante par type. Modifie/complète le
  //    bloc correspondant au type d'œuvre à créer.
  // ---------------------------------------------------------------
  const FICHES = {
    jeuvideo: {
      categorie: 'Jeu',
      titreOriginal: '',
      developpeurs: '',
      editeurs: '',
      synopsis: '',
      genres: [],
      plateformes: [],
      dateSortie: null,
      dateSortieUS: null,
      dateSortieJP: null,
      trailerVO: '',
      trailerVF: '',
      coverUrl: '',
    },
    film: {},
    serie: {
      categorie: 'Série',
      titreOriginal: '',
      createurs: '',
      synopsis: '',
      genres: [],
      nbSaisons: '',
      acteurs: '',
      producteurs: '',
      scenaristes: '',
      chaineOrigine: '',
      statutProduction: '',
      pays: '',
      duree: '',
      dateSortie: null,
      dateSortieFR: null,
      trailerVO: '',
      trailerVF: '',
      coverUrl: '',
    },
    livre: {},
    bd: {},
    album: {},
  };

  // ---------------------------------------------------------------
  // 3. Utilitaires DOM
  // ---------------------------------------------------------------
  function setInputValue(el, value) {
    if (!el || value === null || value === undefined || value === '') return;
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Certains champs (développeur, éditeur…) sont des champs
  // autocomplétion : remplir la valeur déclenche une liste de
  // suggestions qui reste ouverte. On force sa fermeture en simulant
  // Échap + perte de focus, puis en masquant toute liste de
  // suggestions encore visible juste après.
  function setAutocompleteInput(el, value) {
    if (!el || !value) return;
    setInputValue(el, value);
    const esc = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true };
    el.dispatchEvent(new KeyboardEvent('keydown', esc));
    el.dispatchEvent(new KeyboardEvent('keyup', esc));
    el.blur();
    setTimeout(() => {
      const candidates = document.querySelectorAll(
        '[class*="autocomplete" i], [class*="suggest" i], ul[role="listbox"], .ui-autocomplete'
      );
      candidates.forEach((node) => {
        if (node.offsetParent !== null) node.style.display = 'none';
      });
    }, 50);
  }

  // Cas d'un vrai <select multiple> : sélectionne plusieurs options.
  function selectOptionByText(selectEl, textFragments) {
    if (!selectEl || !textFragments) return;
    const fragments = Array.isArray(textFragments) ? textFragments : [textFragments];
    fragments.forEach((frag) => {
      const opt = [...selectEl.options].find((o) =>
        o.textContent.trim().toLowerCase().includes(frag.toLowerCase())
      );
      if (opt) opt.selected = true;
    });
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Choisit UNE option dans un select simple, en évitant de reprendre
  // deux fois la même valeur si plusieurs selects du même groupe sont
  // remplis avec des mots-clés qui se recoupent.
  function selectOneOptionByText(selectEl, text, excludeValues) {
    if (!selectEl || !text) return null;
    const opt = [...selectEl.options].find(
      (o) =>
        o.textContent.trim().toLowerCase() === text.toLowerCase() &&
        !excludeValues.has(o.value)
    ) || [...selectEl.options].find(
      (o) =>
        o.textContent.trim().toLowerCase().includes(text.toLowerCase()) &&
        !excludeValues.has(o.value)
    );
    if (opt) {
      selectEl.value = opt.value;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      return opt.value;
    }
    return null;
  }

  // Le champ "genres" (ou "plateformes") de SensCritique est en réalité
  // plusieurs <select> simples côte à côte (un par slot), pas un seul
  // <select multiple>. Pour les retrouver de façon fiable (peu importe
  // leur position dans le DOM), on cherche tous les <select> de la page
  // qui partagent exactement le même jeu d'options que le select de
  // référence — ce sont forcément les autres slots du même groupe.
  function optionsSignature(selectEl) {
    return [...selectEl.options].map((o) => o.value + '|' + o.textContent.trim()).join(';');
  }

  function findSiblingSlots(refSelect) {
    const sig = optionsSignature(refSelect);
    const slots = [...document.querySelectorAll('select')].filter(
      (s) => s !== refSelect && optionsSignature(s) === sig
    );
    slots.unshift(refSelect);
    return slots;
  }

  function fillGenreSlots(refSelect, genres) {
    if (!refSelect || !genres || !genres.length) return;
    const slots = findSiblingSlots(refSelect);
    const used = new Set();
    genres.forEach((genre, i) => {
      const slot = slots[i];
      if (!slot) return;
      const val = selectOneOptionByText(slot, genre, used);
      if (val) used.add(val);
    });
  }

  function setSelectByValueOrText(selectEl, val) {
    if (!selectEl || !val) return;
    const opt = [...selectEl.options].find(
      (o) => o.value === val || o.textContent.trim() === val
    );
    if (opt) {
      selectEl.value = opt.value;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function fillDate(prefixId, date) {
    if (!date) return;
    const dayEl = document.getElementById(prefixId);
    if (!dayEl) return;
    const root = dayEl.name.split('[').slice(0, -1).join('[');
    setSelectByValueOrText(dayEl, String(parseInt(date.day, 10)));
    const monthEl = dayEl.parentElement?.querySelector(`select[name^="${root}"][name*="month"]`);
    if (monthEl) setSelectByValueOrText(monthEl, String(parseInt(date.month, 10)));
    const yearEl = dayEl.parentElement?.querySelector(`input[name^="${root}"][name*="year"]`);
    if (yearEl) setInputValue(yearEl, date.year);
  }

  // ---------------------------------------------------------------
  // 4. Remplissage générique piloté par le mapping du type choisi
  // ---------------------------------------------------------------
  function fillForm(type) {
    const map = FIELD_MAPS[type];
    const data = FICHES[type];
    if (!map || !data) return;

    let filled = 0;
    let missing = [];

    Object.entries(map).forEach(([key, selector]) => {
      if (key === 'label') return;
      if (key.endsWith('Prefix')) return;
      if (!(key in data)) return;
      const el = document.querySelector(selector);
      if (!el) { missing.push(key); return; }

      const val = data[key];
      const autocompleteFields = new Set(['developpeurs', 'editeurs', 'realisateurs', 'scenaristes', 'createurs', 'auteurs', 'dessinateurs', 'artistes', 'acteurs', 'producteurs']);
      if (key === 'genres' || key === 'plateformes') {
        // Champs à slots multiples : gérés séparément ci-dessous.
        return;
      } else if (el.tagName === 'SELECT') {
        setSelectByValueOrText(el, Array.isArray(val) ? val[0] : val);
      } else if (autocompleteFields.has(key)) {
        setAutocompleteInput(el, val);
      } else {
        setInputValue(el, val);
      }
      filled++;
    });

    const genreEl = map.genres ? document.querySelector(map.genres) : null;
    if (genreEl && data.genres) {
      if (genreEl.multiple) {
        selectOptionByText(genreEl, data.genres);
      } else {
        fillGenreSlots(genreEl, data.genres);
      }
      filled++;
    }

    const platEl = map.plateformes ? document.querySelector(map.plateformes) : null;
    if (platEl && data.plateformes) {
      if (platEl.multiple) {
        selectOptionByText(platEl, data.plateformes);
      } else {
        fillGenreSlots(platEl, data.plateformes);
      }
      filled++;
    }

    // Remplissage générique de tous les champs date*Prefix du mapping
    // (ex. dateSortiePrefix -> data.dateSortie, dateSortieFRPrefix ->
    // data.dateSortieFR, dateOriginePrefix traité à part ci-dessous).
    Object.entries(map).forEach(([key, prefixId]) => {
      if (!key.endsWith('Prefix') || key === 'dateOriginePrefix') return;
      const dataKey = key.slice(0, -'Prefix'.length);
      fillDate(prefixId, data[dataKey]);
    });

    // "Première sortie d'origine" (jeu vidéo uniquement pour l'instant)
    // = date la plus ancienne parmi toutes les dates connues.
    if (map.dateOriginePrefix) {
      const dateKeys = Object.keys(data).filter((k) => k.startsWith('dateSortie'));
      const allDates = dateKeys
        .map((k) => data[k])
        .filter(Boolean)
        .map((d) => ({ d, t: new Date(`${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`).getTime() }))
        .filter((x) => !Number.isNaN(x.t))
        .sort((a, b) => a.t - b.t);
      if (allDates.length) fillDate(map.dateOriginePrefix, allDates[0].d);
    }

    log(missing.length
      ? `${filled} champ(s) rempli(s). Non trouvés sur cette page : ${missing.join(', ')}.`
      : `${filled} champ(s) rempli(s). Vérifie avant de publier.`);
  }

  function downloadCover(type) {
    const url = FICHES[type]?.coverUrl;
    if (!url) { log('Pas de cover définie pour ce type.'); return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cover.jpg';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const FR_MONTHS = {
    'janv': 1, 'janvier': 1, 'févr': 2, 'fév': 2, 'février': 2, 'mars': 3,
    'avr': 4, 'avril': 4, 'mai': 5, 'juin': 6, 'juil': 7, 'juillet': 7,
    'août': 8, 'aout': 8, 'sept': 9, 'septembre': 9, 'oct': 10, 'octobre': 10,
    'nov': 11, 'novembre': 11, 'déc': 12, 'dec': 12, 'décembre': 12,
  };

  function parseFrenchDate(str) {
    if (!str) return null;
    const clean = str.toLowerCase().replace(/\./g, '').trim();
    const m = clean.match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/);
    if (m) {
      const month = FR_MONTHS[m[2]];
      if (month) return { day: m[1], month: String(month), year: m[3] };
    }
    // Format "2022" seul (année uniquement)
    const yOnly = clean.match(/^(\d{4})$/);
    if (yOnly) return { day: '1', month: '1', year: yOnly[1] };
    return null;
  }

  async function fetchSteamDetails(appid) {
    const data = await gmGet(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&l=french&cc=fr`
    );
    return data?.[appid]?.data || null;
  }

  // ---------------------------------------------------------------
  // 4bis. Recherche d'œuvre + preview cover + upload dans le formulaire
  //    Architecture par "fournisseur" (provider) selon le type d'œuvre :
  //    - jeuvideo : API publique Steam (aucune clé nécessaire)
  //    - serie / film : TMDB (nécessite une clé API gratuite, à saisir
  //      dans le menu ⚙️ Options du panneau)
  //    Les autres types (livre, bd, album) n'ont pas encore de source
  //    branchée.
  // ---------------------------------------------------------------
  let selectedSearchResult = null; // { type, id, label, coverUrl }
  let searchDone = false; // true dès qu'une recherche a été validée (résultat sélectionné)

  function updateButtonStates(panel) {
    const autofillBtn = panel.querySelector('#sc-autofill-btn');
    const coverBtn = panel.querySelector('#sc-cover-btn');
    const viewDataBtn = panel.querySelector('#sc-viewdata-btn');
    [
      [autofillBtn, searchDone && isWikiFormPage()],
      [coverBtn, searchDone],
      [viewDataBtn, searchDone],
    ].forEach(([btn, enabled]) => {
      if (!btn) return;
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.45';
      btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    });
  }

  function gmGet(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'json',
        onload: (res) => resolve(res.response),
        onerror: reject,
      });
    });
  }

  function gmGetBlob(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'blob',
        onload: (res) => resolve(res.response),
        onerror: reject,
      });
    });
  }

  function gmPostJson(url, body, headers) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url,
        headers: { 'Content-Type': 'application/json', ...headers },
        data: JSON.stringify(body),
        responseType: 'json',
        onload: (res) => resolve(res.response),
        onerror: reject,
      });
    });
  }

  // --- Clé API TMDB (saisie et mémorisée via le menu ⚙️ Options) -----
  const TMDB_KEY_STORAGE = 'sc-autofill-tmdb-key';
  function getTmdbKey() {
    return (localStorage.getItem(TMDB_KEY_STORAGE) || '').trim();
  }
  function setTmdbKey(key) {
    localStorage.setItem(TMDB_KEY_STORAGE, (key || '').trim());
  }

  function isoToDMY(str) {
    if (!str) return null;
    const [y, m, d] = str.split('-');
    if (!y || !m || !d) return null;
    return { day: String(parseInt(d, 10)), month: String(parseInt(m, 10)), year: y };
  }

  function findYoutubeTrailer(videos) {
    const v = (videos?.results || []).find((x) => x.site === 'YouTube' && x.type === 'Trailer');
    return v ? `https://www.youtube.com/watch?v=${v.key}` : '';
  }

  const SC_UNIVERSE_BY_TYPE = {
    jeuvideo: 'game',
    film: 'movie',
    serie: 'tvshow',
    livre: 'book',
    bd: 'comic',
    album: 'album',
  };

  // Clé d'API publique utilisée par le frontend SensCritique pour les
  // requêtes de recherche anonymes. Plutôt que de la coder en dur (elle
  // peut changer à tout moment côté SensCritique et invalider le
  // script), on la retrouve dynamiquement dans le code de la page
  // elle-même à chaque utilisation — c'est exactement la même clé que
  // le site utilise pour ses propres appels, donc si elle change, on la
  // retrouve automatiquement sans mise à jour du script.
  let cachedScKey = null;

  function findSensCritiqueApiKey() {
    if (cachedScKey) return cachedScKey;
    const chunks = [];
    try {
      if (window.__NEXT_DATA__) chunks.push(JSON.stringify(window.__NEXT_DATA__));
    } catch (e) { /* ignore */ }
    document.querySelectorAll('script:not([src])').forEach((s) => chunks.push(s.textContent || ''));
    document.querySelectorAll('meta[content]').forEach((m) => chunks.push(m.getAttribute('content') || ''));
    const combined = chunks.join('\n');
    // La clé observée fait 32 caractères hexadécimaux — motif générique
    // suffisant pour la retrouver sans dépendre d'un nom de variable
    // précis, qui pourrait changer avec le code du site.
    const match = combined.match(/\b[0-9a-f]{32}\b/i);
    if (match) {
      cachedScKey = match[0];
      return cachedScKey;
    }
    return null;
  }

  // Dernier recours si la détection dynamique échoue (page non encore
  // chargée, structure changée...). Peut devenir invalide avec le temps
  // puisque SensCritique peut faire tourner cette clé sans préavis — ne
  // sert que de filet de sécurité, la détection dynamique est prioritaire.
  const SC_API_KEY_FALLBACK = '05123ad69b3ced9810f04ee1aa1d6168';

  const SC_SEARCH_QUERY = `query SearchProductExplorer($query: String, $offset: Int, $limit: Int, $filters: [SearchFilter], $sortBy: SearchProductExplorerSort) {
  searchProductExplorer(query: $query, filters: $filters, sortBy: $sortBy, offset: $offset, limit: $limit) {
    total
    items {
      title
      originalTitle
      url
      universe
      category
      yearOfProduction
      dateRelease
      __typename
    }
    __typename
  }
}`;

  // Vérifie si l'œuvre existe déjà sur SensCritique via l'API GraphQL
  // interne du site (recherche identique à celle du champ de recherche
  // officiel, filtrée par type d'œuvre). Retente une fois avec la clé
  // de secours si la clé détectée dynamiquement est refusée (401/403).
  async function checkSensCritiqueExists(term, type) {
    const universe = SC_UNIVERSE_BY_TYPE[type] || 'game';
    const body = {
      operationName: 'SearchProductExplorer',
      variables: {
        offset: 0,
        limit: 8,
        query: term,
        filters: [{ identifier: 'universe', termValues: [universe] }],
        sortBy: 'RELEVANCE',
      },
      query: SC_SEARCH_QUERY,
    };
    const tryWithKey = (key) =>
      gmPostJson('https://apollo.senscritique.com/', body, { authorization: key });

    let key = findSensCritiqueApiKey() || SC_API_KEY_FALLBACK;
    let res = await tryWithKey(key);
    const unauthorized = res?.errors?.some((e) =>
      /unauthorized|forbidden|401|403/i.test(e?.message || '')
    );
    if (unauthorized) {
      cachedScKey = null; // force une nouvelle détection
      key = findSensCritiqueApiKey() || SC_API_KEY_FALLBACK;
      res = await tryWithKey(key);
    }

    const items = res?.data?.searchProductExplorer?.items || [];
    return items.map((it) => ({
      href: it.url?.startsWith('http') ? it.url : `https://www.senscritique.com${it.url || ''}`,
      text: `${it.title}${it.yearOfProduction ? ' (' + it.yearOfProduction + ')' : ''}`,
    }));
  }

  // --- Fournisseurs de recherche par type d'œuvre --------------------
  const SEARCH_PROVIDERS = {
    jeuvideo: {
      requiresKey: false,
      search: async (term) => {
        const data = await gmGet(
          `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=french&cc=fr`
        );
        return (data?.items || []).map((i) => ({ id: i.id, label: i.name, thumb: i.tiny_image }));
      },
      select: async (item) => {
        const coverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/library_600x900.jpg`;
        const fallbackCover = `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/header.jpg`;
        const details = await fetchSteamDetails(item.id);
        if (!details) return { coverUrl, fallbackCover, fiche: {} };
        const fiche = {
          titreOriginal: details.name && details.name !== item.label ? details.name : '',
          developpeurs: (details.developers || []).join(', '),
          editeurs: (details.publishers || []).join(', '),
          synopsis: details.short_description || '',
          genres: (details.genres || []).map((g) => g.description).slice(0, 4),
          coverUrl,
        };
        const parsedDate = parseFrenchDate(details.release_date?.date);
        if (parsedDate) fiche.dateSortie = parsedDate;
        const movie = (details.movies || [])[0];
        if (movie?.mp4?.max) fiche.trailerVO = movie.mp4.max;
        const platforms = [];
        if (details.platforms?.windows || details.platforms?.mac || details.platforms?.linux) platforms.push('PC');
        if (platforms.length) fiche.plateformes = platforms;
        return { coverUrl, fallbackCover, fiche, note: 'plateformes limitées à PC — vérifie consoles/mobile manuellement' };
      },
    },
    serie: {
      requiresKey: true,
      search: async (term) => {
        const key = getTmdbKey();
        const data = await gmGet(
          `https://api.themoviedb.org/3/search/tv?api_key=${key}&query=${encodeURIComponent(term)}&language=fr-FR`
        );
        return (data?.results || []).map((r) => ({
          id: r.id,
          label: `${r.name}${r.first_air_date ? ' (' + r.first_air_date.slice(0, 4) + ')' : ''}`,
          thumb: r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : '',
        }));
      },
      select: async (item) => {
        const key = getTmdbKey();
        const d = await gmGet(
          `https://api.themoviedb.org/3/tv/${item.id}?api_key=${key}&language=fr-FR&append_to_response=videos,credits`
        );
        const coverUrl = d.poster_path ? `https://image.tmdb.org/t/p/w780${d.poster_path}` : '';
        const fiche = {
          titreOriginal: d.original_name && d.original_name !== d.name ? d.original_name : '',
          createurs: (d.created_by || []).map((c) => c.name).join(', '),
          synopsis: d.overview || '',
          genres: (d.genres || []).map((g) => g.name).slice(0, 4),
          nbSaisons: d.number_of_seasons ? String(d.number_of_seasons) : '',
          acteurs: (d.credits?.cast || []).slice(0, 5).map((c) => c.name).join(', '),
          producteurs: (d.credits?.crew || []).filter((c) => c.job === 'Executive Producer').slice(0, 3).map((c) => c.name).join(', '),
          chaineOrigine: d.networks?.[0]?.name || '',
          statutProduction: d.status || '',
          pays: (d.origin_country || [])[0] || '',
          duree: d.episode_run_time?.[0] ? `${d.episode_run_time[0]} min` : '',
          dateSortie: isoToDMY(d.first_air_date),
          trailerVO: findYoutubeTrailer(d.videos),
          coverUrl,
        };
        return { coverUrl, fallbackCover: coverUrl, fiche };
      },
    },
    film: {
      requiresKey: true,
      search: async (term) => {
        const key = getTmdbKey();
        const data = await gmGet(
          `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(term)}&language=fr-FR`
        );
        return (data?.results || []).map((r) => ({
          id: r.id,
          label: `${r.title}${r.release_date ? ' (' + r.release_date.slice(0, 4) + ')' : ''}`,
          thumb: r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : '',
        }));
      },
      select: async (item) => {
        const key = getTmdbKey();
        const d = await gmGet(
          `https://api.themoviedb.org/3/movie/${item.id}?api_key=${key}&language=fr-FR&append_to_response=videos,credits`
        );
        const coverUrl = d.poster_path ? `https://image.tmdb.org/t/p/w780${d.poster_path}` : '';
        const fiche = {
          titreOriginal: d.original_title && d.original_title !== d.title ? d.original_title : '',
          realisateurs: (d.credits?.crew || []).filter((c) => c.job === 'Director').map((c) => c.name).join(', '),
          scenaristes: (d.credits?.crew || []).filter((c) => c.job === 'Writer' || c.job === 'Screenplay').slice(0, 3).map((c) => c.name).join(', '),
          synopsis: d.overview || '',
          genres: (d.genres || []).map((g) => g.name).slice(0, 4),
          duree: d.runtime ? `${d.runtime} min` : '',
          dateSortie: isoToDMY(d.release_date),
          trailerVO: findYoutubeTrailer(d.videos),
          coverUrl,
        };
        return { coverUrl, fallbackCover: coverUrl, fiche };
      },
    },
  };

  async function searchWork(type, term) {
    if (!term.trim()) return;
    const provider = SEARCH_PROVIDERS[type];
    if (!provider) {
      log('Recherche non disponible pour ce type d\'œuvre pour le moment.');
      return;
    }
    if (provider.requiresKey && !getTmdbKey()) {
      log('Clé API TMDB manquante — configure-la dans ⚙️ Options.');
      return;
    }

    log('Vérification sur SensCritique…');
    let scMatches = [];
    try {
      scMatches = await checkSensCritiqueExists(term, type);
    } catch (e) {
      log('Vérification SensCritique impossible, passage direct à la recherche.');
    }

    if (scMatches.length) {
      renderScWarning(scMatches, () => runProviderSearch(type, term));
      return;
    }

    await runProviderSearch(type, term);
  }

  function renderScWarning(matches, onContinue) {
    const list = document.getElementById('sc-search-results');
    if (!list) return;
    list.innerHTML = `
      <div style="background:rgba(255,80,80,0.12); border:1px solid rgba(255,80,80,0.4); border-radius:6px; padding:8px; margin-bottom:6px; font-size:12px;">
        Possiblement déjà présent sur SensCritique :
      </div>
    `;
    matches.forEach((m) => {
      const row = document.createElement('a');
      row.href = m.href;
      row.target = '_blank';
      row.style.cssText = 'display:block; font-size:12px; padding:3px 0; text-decoration:none; color:inherit;';
      row.textContent = `↗ ${m.text}`;
      list.appendChild(row);
    });
    const continueBtn = document.createElement('button');
    continueBtn.id = 'sc-steam-continue-btn';
    continueBtn.textContent = 'Aucun ne correspond — chercher quand même';
    continueBtn.style.cssText = 'width:100%; padding:6px; cursor:pointer; font-size:11px; position:sticky; bottom:0; margin-top:4px;';
    continueBtn.addEventListener('click', onContinue);
    list.appendChild(continueBtn);
    refreshTheme();
    log(`${matches.length} résultat(s) trouvé(s) sur SensCritique — vérifie avant de continuer.`);
  }

  async function runProviderSearch(type, term) {
    const provider = SEARCH_PROVIDERS[type];
    log('Recherche en cours…');
    try {
      const items = await provider.search(term);
      renderSearchResults(type, items);
      log(`${items.length} résultat(s).`);
    } catch (e) {
      log('Erreur lors de la recherche — vérifie ta clé API si le type requiert TMDB.');
    }
  }

  function renderSearchResults(type, items) {
    const list = document.getElementById('sc-search-results');
    if (!list) return;
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<div style="font-size:12px; color:var(--sc-muted, #888);">Aucun résultat.</div>';
      return;
    }
    items.slice(0, 8).forEach((item) => {
      const row = document.createElement('div');
      row.style.cssText =
        'display:flex; align-items:center; gap:8px; padding:4px; cursor:pointer; border-radius:4px;';
      row.innerHTML = `
        ${item.thumb ? `<img src="${item.thumb}" style="width:32px; height:44px; object-fit:cover; border-radius:2px;" />` : ''}
        <span style="font-size:12px; flex:1;">${item.label}</span>
      `;
      row.addEventListener('mouseenter', () => (row.style.background = 'rgba(128,128,128,0.15)'));
      row.addEventListener('mouseleave', () => (row.style.background = 'transparent'));
      row.addEventListener('click', () => selectSearchResult(type, item));
      list.appendChild(row);
    });
  }

  async function selectSearchResult(type, item) {
    const provider = SEARCH_PROVIDERS[type];
    selectedSearchResult = { type, id: item.id, label: item.label, coverUrl: item.thumb || '' };
    searchDone = true;
    const mainPanel = document.getElementById('sc-autofill-panel');
    if (mainPanel) updateButtonStates(mainPanel);

    const preview = document.getElementById('sc-cover-preview');
    const previewPanel = document.getElementById('sc-preview-panel');
    log(`Récupération des infos pour ${item.label}…`);

    try {
      const result = await provider.select(item);
      selectedSearchResult.coverUrl = result.coverUrl || item.thumb || '';
      if (preview && previewPanel) {
        preview.src = selectedSearchResult.coverUrl;
        preview.onerror = () => {
          preview.onerror = null;
          preview.src = result.fallbackCover || item.thumb || '';
        };
        previewPanel.style.display = 'block';
        previewPanel.dataset.hasContent = '1';
      }
      Object.assign(FICHES[type], result.fiche);
      log(`${item.label} : champs mis à jour${result.note ? ' (' + result.note + ')' : ''}. Clique "Remplir les champs".`);
    } catch (e) {
      log(`Sélectionné : ${item.label}. Erreur de récupération des détails — remplis le reste manuellement.`);
    }
  }

  function resetSearch() {
    selectedSearchResult = null;
    searchDone = false;
    const mainPanel = document.getElementById('sc-autofill-panel');
    if (mainPanel) updateButtonStates(mainPanel);
    const input = document.getElementById('sc-search-input');
    const list = document.getElementById('sc-search-results');
    const preview = document.getElementById('sc-cover-preview');
    const previewPanel = document.getElementById('sc-preview-panel');
    if (input) input.value = '';
    if (list) list.innerHTML = '';
    if (preview) preview.src = '';
    if (previewPanel) {
      previewPanel.style.display = 'none';
      previewPanel.dataset.hasContent = '0';
    }
    log('Recherche réinitialisée.');
  }

  async function uploadSelectedCover() {
    if (!selectedSearchResult) {
      log('Sélectionne d\'abord un résultat de recherche.');
      return;
    }
    const fileInput = document.querySelector('input[type="file"][name="files[]"]');
    if (!fileInput) {
      log('Champ de fichier introuvable sur cette page.');
      return;
    }
    log('Téléchargement de la jaquette…');
    try {
      const blob = await gmGetBlob(selectedSearchResult.coverUrl);
      const file = new File([blob], 'cover.jpg', { type: blob.type || 'image/jpeg' });
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      log('Jaquette placée dans le champ fichier. Vérifie l\'aperçu du site avant de publier.');
    } catch (e) {
      log('Échec du téléchargement de la jaquette — upload manuel requis.');
    }
  }

  // ---------------------------------------------------------------
  // 5. Thème clair / sombre (persisté)
  // ---------------------------------------------------------------
  const THEME_KEY = 'sc-autofill-theme';
  let currentTheme = null; // défini au build du panneau, mis à jour au toggle
  function getTheme() {
    return localStorage.getItem(THEME_KEY) ||
      (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  // Réapplique le thème courant à tous les panneaux existants — à
  // appeler après tout rendu dynamique (résultats, données, etc.).
  function refreshTheme() {
    const panel = document.getElementById('sc-autofill-panel');
    const previewPanel = document.getElementById('sc-preview-panel');
    const theme = currentTheme || getTheme();
    if (panel) applyTheme(panel, theme);
    if (previewPanel) applyTheme(previewPanel, theme);
  }
  function applyTheme(panel, theme) {
    const dark = theme === 'dark';
    panel.style.background = dark ? '#1e1e1e' : '#ffffff';
    panel.style.color = dark ? '#eaeaea' : '#1a1a1a';
    panel.style.borderColor = dark ? '#3a3a3a' : '#ccc';
    panel.querySelectorAll('button').forEach((b) => {
      b.style.background = dark ? '#2c2c2c' : '#f5f5f5';
      b.style.color = dark ? '#eaeaea' : '#1a1a1a';
      b.style.border = `1px solid ${dark ? '#444' : '#ccc'}`;
      b.style.opacity = b.disabled ? '0.45' : '1';
      b.style.cursor = b.disabled ? 'not-allowed' : 'pointer';
    });
    panel.querySelectorAll('select, input[type="text"]').forEach((s) => {
      s.style.background = dark ? '#2c2c2c' : '#fff';
      s.style.color = dark ? '#eaeaea' : '#1a1a1a';
      s.style.border = `1px solid ${dark ? '#444' : '#ccc'}`;
    });
    const log_ = panel.querySelector('#sc-autofill-log');
    if (log_) log_.style.color = dark ? '#999' : '#666';
    const hint = panel.querySelector('#sc-autofill-hint');
    if (hint) hint.style.color = dark ? '#888' : '#999';
    const noFormLink = panel.querySelector('#sc-no-form-notice a');
    if (noFormLink) {
      noFormLink.style.color = dark ? '#ffffff' : '#1a1a1a';
      noFormLink.style.borderColor = dark ? '#ffffff' : '#1a1a1a';
    }
    const stickyBtn = panel.querySelector('#sc-steam-continue-btn');
    if (stickyBtn) stickyBtn.style.background = dark ? '#1e1e1e' : '#ffffff';
    const optionsPanel = panel.querySelector('#sc-options-panel');
    if (optionsPanel) optionsPanel.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
    const footer = panel.querySelector('#sc-footer');
    if (footer) footer.style.color = dark ? '#888' : '#999';
  }

  // ---------------------------------------------------------------
  // 6. Panneau flottant
  // ---------------------------------------------------------------
  function log(msg) {
    const el = document.getElementById('sc-autofill-log');
    if (el) el.textContent = msg;
  }

  function detectType() {
    const path = location.pathname.toLowerCase();
    if (path.includes('jeuxvideo') || path.includes('jeuvideo')) return 'jeuvideo';
    if (path.includes('film')) return 'film';
    if (path.includes('serie')) return 'serie';
    if (path.includes('bd')) return 'bd';
    if (path.includes('livre')) return 'livre';
    if (path.includes('album') || path.includes('musique')) return 'album';
    return 'jeuvideo';
  }

  // La page courante est-elle bien un formulaire d'édition de fiche wiki ?
  function isWikiFormPage() {
    return !!(
      document.getElementById('scwiki-storyline') ||
      document.getElementById('scwiki-originaltitle') ||
      document.getElementById('scwiki-genres')
    );
  }

  const FIELD_LABELS = {
    categorie: 'Catégorie', titreOriginal: 'Titre original', developpeurs: 'Développeur(s)',
    editeurs: 'Éditeur(s)', synopsis: 'Synopsis', genres: 'Genres', plateformes: 'Plateformes',
    dateSortie: 'Date de sortie', dateSortieUS: 'Date de sortie US', dateSortieJP: 'Date de sortie JP',
    trailerVO: 'Bande-annonce VO', trailerVF: 'Bande-annonce VF', coverUrl: 'URL cover',
    realisateurs: 'Réalisateur(s)', scenaristes: 'Scénariste(s)', duree: 'Durée',
    createurs: 'Créateur(s)', nbSaisons: 'Nb de saisons', auteurs: 'Auteur(s)', nbPages: 'Nb de pages',
    dessinateurs: 'Dessinateur(s)', artistes: 'Artiste(s)', label_musique: 'Label',
    dateSortieFR: 'Date de sortie France', acteurs: 'Acteur(s)', producteurs: 'Producteur(s)',
    chaineOrigine: 'Chaîne d\'origine', statutProduction: 'Statut de production', pays: 'Pays',
  };

  function formatFieldValue(val) {
    if (val === null || val === undefined || val === '') return '';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object' && 'day' in val) return `${val.day}/${val.month}/${val.year}`;
    return String(val);
  }

  function renderDataList(container, type) {
    const data = FICHES[type] || {};
    container.innerHTML = '';
    Object.entries(data).forEach(([key, val]) => {
      const display = formatFieldValue(val);
      if (!display) return;
      const label = FIELD_LABELS[key] || key;
      const row = document.createElement('div');
      row.style.cssText = 'padding:6px 0; border-top:1px solid rgba(128,128,128,0.25); display:flex; justify-content:space-between; align-items:flex-start; gap:8px;';
      row.innerHTML = `
        <div style="flex:1; min-width:0;">
          <div style="font-size:10px; opacity:0.7;">${label}</div>
          <div style="font-size:12px; word-break:break-word;">${display}</div>
        </div>
        <button data-copy="${encodeURIComponent(display)}" style="flex-shrink:0; padding:3px 6px; cursor:pointer; font-size:11px;">Copier</button>
      `;
      container.appendChild(row);
    });
    container.querySelectorAll('button[data-copy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(decodeURIComponent(btn.dataset.copy));
        const old = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => (btn.textContent = old), 800);
      });
    });
  }

  function buildPanel() {
    const wrapper = document.createElement('div');
    wrapper.id = 'sc-autofill-wrapper';
    wrapper.style.cssText = `
      position: fixed; top: 80px; right: 16px; z-index: 999999;
      display: flex; align-items: flex-start; gap: 8px;
    `;

    const panel = document.createElement('div');
    panel.id = 'sc-autofill-panel';
    panel.style.cssText = `
      width: 270px; border: 1px solid #ccc; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: sans-serif; font-size: 13px;
      padding: 12px; max-height: 90vh; display: flex; flex-direction: column;
      box-sizing: border-box;
    `;

    // Panneau latéral pour la preview de la jaquette, à droite du panneau principal
    const previewPanel = document.createElement('div');
    previewPanel.id = 'sc-preview-panel';
    previewPanel.style.cssText = `
      display: none; width: 200px; border: 1px solid #ccc; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: sans-serif; font-size: 13px;
      padding: 10px;
    `;

    const options = Object.entries(FIELD_MAPS)
      .map(([key, m]) => `<option value="${key}">${m.label}</option>`)
      .join('');

    panel.innerHTML = `
      <div id="sc-drag-handle" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; cursor:move; flex-shrink:0;">
        <span style="font-weight:600;">⠿ Assistant fiche wiki</span>
        <div style="display:flex; gap:4px;">
          <button id="sc-options-toggle" title="Options" style="padding:2px 8px; cursor:pointer;">⚙️</button>
          <button id="sc-minimize-toggle" style="padding:2px 8px; cursor:pointer;">–</button>
          <button id="sc-theme-toggle" style="padding:2px 8px; cursor:pointer;">🌓</button>
        </div>
      </div>
      <div id="sc-options-panel" style="display:none; flex-shrink:0; margin-bottom:8px; padding:8px; border-radius:6px; border:1px solid rgba(128,128,128,0.3);">
        <label for="sc-tmdb-key-input" style="font-size:11px; display:block; margin-bottom:4px;">Clé API TMDB (pour film / série) :</label>
        <div style="display:flex; gap:6px;">
          <input id="sc-tmdb-key-input" type="text" placeholder="Clé API TMDB…" style="flex:1; padding:5px; font-size:12px;" />
          <button id="sc-tmdb-key-save" style="padding:5px 8px; cursor:pointer;">Sauver</button>
        </div>
        <div style="font-size:10px; margin-top:4px; opacity:0.7;">
          Clé gratuite sur <a href="https://www.themoviedb.org/settings/api" target="_blank" style="color:inherit;">themoviedb.org/settings/api</a> — mémorisée sur cet ordinateur uniquement.
        </div>
        <div id="sc-tmdb-key-status" style="font-size:10px; margin-top:4px;"></div>
      </div>
      <div id="sc-body" style="overflow-y:auto; min-height:0; flex:1 1 auto;">
        ${isWikiFormPage() ? '' : `
        <div id="sc-no-form-notice" style="background:rgba(255,193,7,0.15); border:1px solid rgba(255,193,7,0.5); border-radius:6px; padding:8px; margin-bottom:8px; font-size:12px;">
          Cette page n'est pas une fiche wiki éditable.
          <a href="https://old.senscritique.com/wiki" target="_blank" style="display:block; margin-top:6px; text-align:center; padding:5px; border:1px solid currentColor; border-radius:4px; text-decoration:none;">Aller créer/éditer une fiche →</a>
        </div>`}
        <select id="sc-type-select" style="width:100%; padding:5px; margin-bottom:8px;">${options}</select>

        <div style="display:flex; gap:6px; margin-bottom:6px;">
          <input id="sc-search-input" type="text" placeholder="Nom de l'œuvre…" style="flex:1; padding:5px;" />
          <button id="sc-search-btn" style="padding:5px 8px; cursor:pointer;">🔍</button>
          <button id="sc-reset-btn" title="Réinitialiser la recherche" style="padding:5px 8px; cursor:pointer;">↺</button>
        </div>
        <div id="sc-search-results" style="max-height:160px; overflow-y:auto; margin-bottom:8px;"></div>

        <button id="sc-autofill-btn" style="width:100%; padding:6px; margin-bottom:6px; cursor:pointer;" disabled>Remplir les champs</button>
        <button id="sc-cover-btn" style="width:100%; padding:6px; margin-bottom:6px; cursor:pointer;" disabled>Télécharger cover.jpg</button>
        <button id="sc-viewdata-btn" style="width:100%; padding:6px; margin-bottom:6px; cursor:pointer;" disabled>📋 Voir les données</button>
        <div id="sc-data-list" style="display:none; margin-bottom:6px; max-height:33vh; overflow-y:auto;"></div>
        <div id="sc-autofill-log" style="font-size:11px; margin-top:6px;"></div>
        <div id="sc-autofill-hint" style="font-size:10px; margin-top:8px;">Ne publie/n'enregistre rien automatiquement — vérifie avant de valider.</div>
      </div>
      <div id="sc-footer" style="flex-shrink:0; margin-top:8px; padding-top:6px; border-top:1px solid rgba(128,128,128,0.25); font-size:9px; line-height:1.4; display:flex; align-items:center; gap:6px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 185.04 133.4" style="width:18px; height:auto; flex-shrink:0;" aria-label="TMDB logo"><defs><linearGradient id="sc-tmdb-grad" y1="66.7" x2="185.04" y2="66.7" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#90cea1"/><stop offset="0.56" stop-color="#3cbec9"/><stop offset="1" stop-color="#00b3e5"/></linearGradient></defs><path fill="url(#sc-tmdb-grad)" d="M51.06,66.7h0A17.67,17.67,0,0,1,68.73,49h-.1A17.67,17.67,0,0,1,86.3,66.7h0A17.67,17.67,0,0,1,68.63,84.37h.1A17.67,17.67,0,0,1,51.06,66.7Zm82.67-31.33h32.9A17.67,17.67,0,0,0,184.3,17.7h0A17.67,17.67,0,0,0,166.63,0h-32.9A17.67,17.67,0,0,0,116.06,17.7h0A17.67,17.67,0,0,0,133.73,35.37Zm-113,98h63.9A17.67,17.67,0,0,0,102.3,115.7h0A17.67,17.67,0,0,0,84.63,98H20.73A17.67,17.67,0,0,0,3.06,115.7h0A17.67,17.67,0,0,0,20.73,133.37Zm83.92-49h6.25L125.5,49h-8.35l-8.9,23.2h-.1L99.4,49H90.5Zm32.45,0h7.8V49h-7.8Zm22.2,0h24.95V77.2H167.1V70h15.35V62.8H167.1V56.2h16.25V49h-24ZM10.1,35.4h7.8V6.9H28V0H0V6.9H10.1ZM39,35.4h7.8V20.1H61.9V35.4h7.8V0H61.9V13.2H46.75V0H39Zm41.25,0h25V28.2H88V21h15.35V13.8H88V7.2h16.25V0h-24Zm-79,49H9V57.25h.1l9,27.15H24l9.3-27.15h.1V84.4h7.8V49H29.45l-8.2,23.1h-.1L13,49H1.2Zm112.09,49H126a24.59,24.59,0,0,0,7.56-1.15,19.52,19.52,0,0,0,6.35-3.37,16.37,16.37,0,0,0,4.37-5.5A16.91,16.91,0,0,0,146,115.8a18.5,18.5,0,0,0-1.68-8.25,15.1,15.1,0,0,0-4.52-5.53A18.55,18.55,0,0,0,133.07,99,33.54,33.54,0,0,0,125,98H113.29Zm7.81-28.2h4.6a17.43,17.43,0,0,1,4.67.62,11.68,11.68,0,0,1,3.88,1.88,9,9,0,0,1,2.62,3.18,9.87,9.87,0,0,1,1,4.52,11.92,11.92,0,0,1-1,5.08,8.69,8.69,0,0,1-2.67,3.34,10.87,10.87,0,0,1-4,1.83,21.57,21.57,0,0,1-5,.55H121.1Zm36.14,28.2h14.5a23.11,23.11,0,0,0,4.73-.5,13.38,13.38,0,0,0,4.27-1.65,9.42,9.42,0,0,0,3.1-3,8.52,8.52,0,0,0,1.2-4.68,9.16,9.16,0,0,0-.55-3.2,7.79,7.79,0,0,0-1.57-2.62,8.38,8.38,0,0,0-2.45-1.85,10,10,0,0,0-3.18-1v-.1a9.28,9.28,0,0,0,4.43-2.82,7.42,7.42,0,0,0,1.67-5,8.34,8.34,0,0,0-1.15-4.65,7.88,7.88,0,0,0-3-2.73,12.9,12.9,0,0,0-4.17-1.3,34.42,34.42,0,0,0-4.63-.32h-13.2Zm7.8-28.8h5.3a10.79,10.79,0,0,1,1.85.17,5.77,5.77,0,0,1,1.7.58,3.33,3.33,0,0,1,1.23,1.13,3.22,3.22,0,0,1,.47,1.82,3.63,3.63,0,0,1-.42,1.8,3.34,3.34,0,0,1-1.13,1.2,4.78,4.78,0,0,1-1.57.65,8.16,8.16,0,0,1-1.78.2H165Zm0,14.15h5.9a15.12,15.12,0,0,1,2.05.15,7.83,7.83,0,0,1,2,.55,4,4,0,0,1,1.58,1.17,3.13,3.13,0,0,1,.62,2,3.71,3.71,0,0,1-.47,1.95,4,4,0,0,1-1.23,1.3,4.78,4.78,0,0,1-1.67.7,8.91,8.91,0,0,1-1.83.2h-7Z"/></svg>
        <span>This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.
        <a href="https://www.themoviedb.org" target="_blank" style="color:inherit; text-decoration:underline;">themoviedb.org</a></span>
      </div>
    `;

    previewPanel.innerHTML = `
      <div style="font-weight:600; margin-bottom:6px; font-size:12px;">Jaquette</div>
      <img id="sc-cover-preview" style="width:100%; border-radius:4px; display:block; margin-bottom:8px;" />
      <button id="sc-upload-btn" style="width:100%; padding:6px; cursor:pointer;">Valider et uploader</button>
    `;

    wrapper.appendChild(panel);
    wrapper.appendChild(previewPanel);
    document.body.appendChild(wrapper);
    updateButtonStates(panel);

    const typeSelect = panel.querySelector('#sc-type-select');
    typeSelect.value = detectType();

    panel.querySelector('#sc-autofill-btn').addEventListener('click', () => fillForm(typeSelect.value));
    panel.querySelector('#sc-cover-btn').addEventListener('click', () => downloadCover(typeSelect.value));

    // Menu Options : saisie et mémorisation de la clé API TMDB
    const optionsPanel = panel.querySelector('#sc-options-panel');
    const optionsToggle = panel.querySelector('#sc-options-toggle');
    const tmdbInput = panel.querySelector('#sc-tmdb-key-input');
    const tmdbStatus = panel.querySelector('#sc-tmdb-key-status');
    tmdbInput.value = getTmdbKey();
    function refreshTmdbStatus() {
      tmdbStatus.textContent = getTmdbKey() ? '✓ Clé enregistrée' : 'Aucune clé enregistrée';
    }
    refreshTmdbStatus();
    optionsToggle.addEventListener('click', () => {
      const open = optionsPanel.style.display !== 'none';
      optionsPanel.style.display = open ? 'none' : 'block';
    });
    panel.querySelector('#sc-tmdb-key-save').addEventListener('click', () => {
      setTmdbKey(tmdbInput.value);
      refreshTmdbStatus();
      log('Clé API TMDB enregistrée.');
    });
    panel.querySelector('#sc-search-btn').addEventListener('click', () =>
      searchWork(typeSelect.value, panel.querySelector('#sc-search-input').value)
    );
    panel.querySelector('#sc-search-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchWork(typeSelect.value, e.target.value);
    });
    panel.querySelector('#sc-reset-btn').addEventListener('click', resetSearch);
    previewPanel.querySelector('#sc-upload-btn').addEventListener('click', uploadSelectedCover);

    const dataList = panel.querySelector('#sc-data-list');
    const viewDataBtn = panel.querySelector('#sc-viewdata-btn');
    let dataListOpen = false;
    let theme = getTheme();
    currentTheme = theme;
    viewDataBtn.addEventListener('click', () => {
      dataListOpen = !dataListOpen;
      if (dataListOpen) { renderDataList(dataList, typeSelect.value); applyTheme(panel, theme); }
      dataList.style.display = dataListOpen ? 'block' : 'none';
      viewDataBtn.textContent = dataListOpen ? '📋 Masquer les données' : '📋 Voir les données';
    });
    typeSelect.addEventListener('change', () => {
      if (dataListOpen) { renderDataList(dataList, typeSelect.value); applyTheme(panel, theme); }
    });

    // Réduction du panneau (masque le corps, garde juste l'en-tête)
    const body = panel.querySelector('#sc-body');
    const minimizeBtn = panel.querySelector('#sc-minimize-toggle');
    let minimized = localStorage.getItem('sc-autofill-minimized') === '1';
    function applyMinimized() {
      body.style.display = minimized ? 'none' : 'block';
      previewPanel.style.display = minimized ? 'none' : previewPanel.dataset.hasContent === '1' ? 'block' : 'none';
      minimizeBtn.textContent = minimized ? '□' : '–';
    }
    applyMinimized();
    minimizeBtn.addEventListener('click', () => {
      minimized = !minimized;
      localStorage.setItem('sc-autofill-minimized', minimized ? '1' : '0');
      applyMinimized();
    });

    // Déplacement du panneau par glisser-déposer (position sauvegardée)
    const dragHandle = panel.querySelector('#sc-drag-handle');
    const savedPos = JSON.parse(localStorage.getItem('sc-autofill-pos') || 'null');
    if (savedPos) {
      // Recadrage dans les limites de l'écran, au cas où la position
      // sauvegardée serait devenue inaccessible (fenêtre redimensionnée,
      // ancienne position hors écran…).
      const clampedTop = Math.min(Math.max(savedPos.top, 0), window.innerHeight - 40);
      const clampedLeft = Math.min(Math.max(savedPos.left, 0), window.innerWidth - 60);
      wrapper.style.top = clampedTop + 'px';
      wrapper.style.left = clampedLeft + 'px';
      wrapper.style.right = 'auto';
    }
    let dragging = false, offsetX = 0, offsetY = 0;
    dragHandle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return; // ne pas démarrer un drag depuis un bouton de l'en-tête
      dragging = true;
      const rect = wrapper.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const left = Math.min(Math.max(e.clientX - offsetX, 0), window.innerWidth - 60);
      const top = Math.min(Math.max(e.clientY - offsetY, 0), window.innerHeight - 40);
      wrapper.style.left = left + 'px';
      wrapper.style.top = top + 'px';
      wrapper.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      const rect = wrapper.getBoundingClientRect();
      localStorage.setItem('sc-autofill-pos', JSON.stringify({ left: rect.left, top: rect.top }));
    });
    // Double-clic sur l'en-tête : réinitialise la position par défaut
    dragHandle.addEventListener('dblclick', () => {
      localStorage.removeItem('sc-autofill-pos');
      wrapper.style.top = '80px';
      wrapper.style.right = '16px';
      wrapper.style.left = 'auto';
    });

    applyTheme(panel, theme);
    applyTheme(previewPanel, theme);
    panel.querySelector('#sc-theme-toggle').addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      currentTheme = theme;
      localStorage.setItem(THEME_KEY, theme);
      applyTheme(panel, theme);
      applyTheme(previewPanel, theme);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildPanel);
  } else {
    buildPanel();
  }
})();