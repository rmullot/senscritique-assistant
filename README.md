# senscritique-assistant

Script à utiliser via Tampermonkey dans votre navigateur pour simplifier le processus de création de fiches wiki sur SensCritique (recherche automatique sur Steam/TMDB, vérification préalable de doublon sur SensCritique, pré-remplissage des champs du formulaire, aperçu et upload de la jaquette).

## Avertissement

Ce projet est **non officiel** et **indépendant**. Son auteur n'est ni propriétaire, ni affilié, ni partenaire de SensCritique, TMDB, Steam/Valve, ni des marques associées. Chaque marque reste la propriété de ses détenteurs respectifs. Ce script se contente d'interagir avec le formulaire d'édition de fiche wiki tel qu'exposé publiquement par le site, à des fins personnelles et non commerciales (voir [license.md](license.md)).

Le script ne publie ni n'enregistre jamais rien automatiquement sur SensCritique : il ne fait que pré-remplir les champs du formulaire, à vous de vérifier et de valider avant publication.

## Fonctionnalités

- Panneau flottant, déplaçable, réductible, avec thème clair/sombre
- Sélection du type d'œuvre (Jeu vidéo, Film, Série TV, Livre, BD, Album — seuls Jeu vidéo/Film/Série ont une source de recherche branchée pour l'instant)
- Recherche par nom : vérifie d'abord si l'œuvre existe déjà sur SensCritique, puis interroge Steam (jeu vidéo) ou TMDB (film/série)
- Aperçu de la jaquette avec upload direct dans le champ fichier du formulaire, après validation manuelle
- Pré-remplissage des champs texte, dates, genres et plateformes/genres à slots multiples
- Bouton « Voir les données » : liste complète des champs avec copie individuelle, en secours si un champ ne se remplit pas automatiquement
- Redirection vers le wiki si la page courante n'est pas un formulaire de fiche éditable

## Installation

1. Installez l'extension Tampermonkey dans votre navigateur :
   - [Chrome / Edge / Brave](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox](https://addons.mozilla.org/fr/firefox/addon/tampermonkey/)
   - [Safari](https://apps.apple.com/app/tampermonkey/id1482490089)
2. Ouvrez le tableau de bord Tampermonkey (icône de l'extension → « Tableau de bord »).
3. Allez dans l'onglet **Scripts utilisateurs**, cliquez sur **+ Créer un script**.
4. Supprimez le contenu par défaut et collez-y l'intégralité du contenu du fichier [`senscritique-wiki-autofill.user.js`](senscritique-wiki-autofill.user.js) de ce dépôt.
5. Enregistrez (`Ctrl+S` / `Cmd+S`). Le script apparaît alors dans la liste, activé par défaut.
6. Rendez-vous sur une page de fiche wiki SensCritique (`https://www.senscritique.com/...` ou `https://old.senscritique.com/wiki`) : un panneau flottant « Assistant fiche wiki » doit apparaître en haut à droite.

Alternative : si votre installation de Tampermonkey détecte l'ajout automatique de scripts, vous pouvez aussi ouvrir le fichier `.user.js` directement dans votre navigateur (double-clic ou glisser-déposer dans un onglet) ; Tampermonkey proposera automatiquement de l'installer.

## Configuration de la clé API TMDB (pour Film / Série)

La recherche pour les types « Film » et « Série TV » utilise l'API de [TMDB (The Movie Database)](https://www.themoviedb.org/), qui nécessite une clé API personnelle et gratuite.

1. Créez un compte sur [themoviedb.org](https://www.themoviedb.org/signup).
2. Une fois connecté, rendez-vous dans **Paramètres du compte → API** : https://www.themoviedb.org/settings/api
3. Cliquez sur **Créer** / **Demander une clé API**, choisissez l'usage « Développeur », et remplissez le court formulaire (l'usage personnel/non commercial convient).
4. Une fois la clé générée, copiez la valeur **« Clé API (v3 auth) »**.
5. Dans le panneau flottant du script, sur SensCritique, cliquez sur l'icône ⚙️ **Options**, collez la clé dans le champ « Clé API TMDB », puis cliquez sur **Sauver**.

La clé est mémorisée uniquement dans le `localStorage` de votre navigateur, sur votre ordinateur — elle n'est jamais envoyée à un tiers autre que l'API TMDB elle-même.

La recherche pour « Jeu vidéo » (via l'API Steam) et la vérification de doublon sur SensCritique ne nécessitent aucune clé à saisir : la clé SensCritique est détectée automatiquement depuis la page elle-même (voir section conformité ci-dessous).

## Sources de données et conformité légale

Ce script s'appuie sur trois sources externes, dont le statut légal diffère sensiblement :

### TMDB — conforme

TMDB publie des [conditions d'utilisation de son API](https://www.themoviedb.org/api-terms-of-use) explicites, respectées par ce script :

- Usage strictement personnel et **non commercial** (une clé commerciale distincte et un accord écrit avec TMDB seraient obligatoires pour tout usage commercial — ce n'est pas le cas ici)
- Attribution obligatoire affichée en permanence dans le panneau (texte exact exigé + logo officiel non modifié, moins proéminent que l'identité du script)
- Aucun contenu TMDB n'est mis en cache au-delà de la session en cours : seule la clé API que **vous** saisissez est mémorisée localement, jamais les données/images renvoyées par l'API

### Steam — toléré, non garanti

Il existe deux API distinctes chez Valve :

- La **Steam Web API officielle** (documentée, clé signée, [conditions publiées](https://steamcommunity.com/dev/apiterms)) — **n'est pas** celle utilisée ici.
- La **Storefront API** (`store.steampowered.com/api/storesearch`, `/api/appdetails`) — c'est celle utilisée par ce script. Il s'agit de l'API interne, non documentée, du client Steam et du site boutique. Elle n'est couverte par **aucune** condition d'utilisation publiée par Valve. Son usage est toléré en pratique par de nombreux projets tiers connus (SteamDB, IsThereAnyDeal…), mais sans garantie de stabilité ni de disponibilité : elle peut être limitée en débit, modifiée ou bloquée sans préavis.

Usage ici strictement personnel, en lecture seule, à faible volume.

### SensCritique — zone grise, à usage prudent

Contrairement à TMDB et Steam, **SensCritique ne publie aucune API ni conditions d'utilisation développeur**. Ce script appelle leur API GraphQL interne (`apollo.senscritique.com`) avec la même clé que leur propre frontend utilise pour la recherche anonyme.

Cette clé n'est **pas codée en dur** : elle est retrouvée dynamiquement dans le code de la page à chaque utilisation (avec un filet de sécurité en dernier recours si la détection échoue), afin de rester fonctionnelle même si SensCritique la fait tourner.

Points importants :

- Usage strictement en **lecture seule** (aucune donnée n'est modifiée sur leurs serveurs), personnel et à faible volume
- Sert uniquement à vérifier qu'une fiche n'existe pas déjà avant d'en préparer une nouvelle — un usage cohérent avec l'objectif du site
- Ne se substitue jamais à la publication, qui reste **100 % manuelle**, effectuée par vous, connecté, via l'interface officielle du site
- Peut néanmoins être considéré comme un accès non autorisé à une API interne au regard des conditions générales de SensCritique (non consultables publiquement au moment de la rédaction de ce document — leur `robots.txt` bloque l'accès automatisé, y compris pour simple lecture)

**En cas de doute sur la légalité de cet usage pour votre situation, ou si vous représentez SensCritique et souhaitez que cette fonctionnalité soit retirée, ouvrez une issue sur ce dépôt.**

## Licence

Voir [license.md](license.md) (PolyForm Noncommercial License 1.0.0 — usage non commercial uniquement).
