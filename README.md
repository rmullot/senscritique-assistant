# senscritique-assistant

**senscritique-assistant** est un petit outil gratuit qui simplifie la création de fiches wiki sur [SensCritique](https://www.senscritique.com/) (jeux vidéo, films, séries, livres, BD).

Concrètement, quand vous êtes sur le formulaire d'édition d'une fiche wiki SensCritique, un panneau flottant apparaît. Vous y tapez le nom de l'œuvre, l'outil va chercher les informations sur Steam, TMDB ou Google Books (selon le type d'œuvre), vous montre un aperçu (titre, résumé, date, genres, jaquette…), et si ça vous convient, pré-remplit automatiquement les champs du formulaire à votre place.

**Il ne publie jamais rien tout seul** : c'est toujours vous qui relisez et cliquez sur le bouton de publication du formulaire SensCritique. L'outil ne fait que vous faire gagner le temps de recopie manuelle.

Il se présente sous la forme d'un **script Tampermonkey** (aussi appelé « userscript ») : un petit programme qui s'installe dans votre navigateur et ne s'active que sur les pages de SensCritique. Si vous n'avez jamais utilisé Tampermonkey, pas d'inquiétude : ce document vous guide pas à pas, sans prérequis technique.

## Avertissement

Ce projet est **non officiel** et **indépendant**. Son auteur n'est ni propriétaire, ni affilié, ni partenaire de SensCritique, TMDB, Steam/Valve, ni des marques associées. Chaque marque reste la propriété de ses détenteurs respectifs. Ce script se contente d'interagir avec le formulaire d'édition de fiche wiki tel qu'exposé publiquement par le site, à des fins personnelles et non commerciales (voir [license.md](license.md)).

Le script ne publie ni n'enregistre jamais rien automatiquement sur SensCritique : il ne fait que pré-remplir les champs du formulaire, à vous de vérifier et de valider avant publication.

## Fonctionnalités

- Panneau flottant, déplaçable, réductible, avec thème clair/sombre
- Sélection du type d'œuvre (Jeu vidéo, Film, Série TV, Livre, BD)
- Recherche par nom : vérifie d'abord si l'œuvre existe déjà sur SensCritique, puis interroge Steam (jeu vidéo), TMDB (film/série) ou Google Books (livre/BD)
- Mise à jour automatique du script via Tampermonkey (le dépôt GitHub sert de source `@updateURL`)
- Aperçu de la jaquette avec upload direct dans le champ fichier du formulaire, après validation manuelle
- Pré-remplissage des champs texte, dates, genres et plateformes/genres à slots multiples
- Bouton « Voir les données » : liste complète des champs avec copie individuelle, en secours si un champ ne se remplit pas automatiquement
- Redirection vers le wiki si la page courante n'est pas un formulaire de fiche éditable

---

## Tutoriel d'installation (pour débutants)

Ce tutoriel ne suppose aucune connaissance technique. Il se déroule en trois étapes : installer Tampermonkey, installer le script, puis (si besoin) configurer une clé API gratuite pour Film/Série et éventuellement Livre/BD.

### Étape 1 — Qu'est-ce que Tampermonkey, et pourquoi en ai-je besoin ?

[Tampermonkey](https://www.tampermonkey.net/) est une extension de navigateur (gratuite, très populaire, utilisée par des millions de personnes) qui permet d'exécuter de petits scripts personnalisés sur certains sites web — un peu comme un plugin. Elle ne fait rien toute seule : elle sert simplement de « moteur » pour faire tourner des scripts que vous choisissez d'installer, comme celui de ce dépôt.

Elle est disponible pour tous les navigateurs courants :

- [Chrome / Edge / Brave](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Firefox](https://addons.mozilla.org/fr/firefox/addon/tampermonkey/)
- [Safari](https://apps.apple.com/app/tampermonkey/id1482490089)
- [Opera](https://addons.opera.com/fr/extensions/details/tampermonkey-beta/)

Cliquez sur le lien correspondant à votre navigateur, puis sur **Ajouter** (ou **Get**/**Installer**) pour l'ajouter à votre navigateur. Une icône Tampermonkey (un petit personnage noir et blanc) apparaît alors en haut à droite de votre navigateur, à côté de la barre d'adresse.

> **Utilisateurs d'Opera :** une étape supplémentaire est nécessaire. Ouvrez `opera://extensions`, repérez Tampermonkey, cliquez sur **Détails**, puis activez l'option **Autoriser les scripts utilisateurs**. Sans cela, Opera bloque l'exécution des scripts par Tampermonkey et le panneau n'apparaîtra jamais sur SensCritique.
>
> Les autres navigateurs à base de Chromium (Chrome, Edge, Brave) ont introduit une restriction similaire : si le script ne se charge pas, vérifiez que le **mode développeur** est activé sur la page des extensions (`chrome://extensions`, `edge://extensions`, etc.) — Tampermonkey en a besoin pour continuer à fonctionner correctement.

### Étape 2 — Installer le script senscritique-assistant

1. Cliquez sur l'icône Tampermonkey, puis sur **Tableau de bord** (« Dashboard »).
2. Dans le tableau de bord, allez dans l'onglet **Scripts utilisateurs** (« Utilisateurs Scripts »).
3. Cliquez sur le gros bouton **+ Créer un script** (« Create a new script »). Un éditeur de code s'ouvre, avec du code déjà présent par défaut.
4. Sélectionnez tout ce code par défaut (`Ctrl+A` / `Cmd+A`) et supprimez-le.
5. Ouvrez le fichier [`senscritique-wiki-autofill.user.js`](senscritique-wiki-autofill.user.js) de ce dépôt, copiez tout son contenu, et collez-le dans l'éditeur Tampermonkey à la place.
6. Enregistrez avec `Ctrl+S` (Windows/Linux) ou `Cmd+S` (Mac). Une fenêtre de confirmation peut s'afficher : validez.
7. Retournez dans l'onglet **Scripts utilisateurs** du tableau de bord : le script « Assistant fiche wiki SensCritique » doit y apparaître, avec un interrupteur activé (vert/bleu).

> Astuce : si votre installation de Tampermonkey le permet, vous pouvez aussi simplement ouvrir le fichier `.user.js` directement dans un onglet du navigateur (double-clic sur le fichier téléchargé, ou glisser-déposer dans une fenêtre du navigateur) : Tampermonkey détecte le script et propose de l'installer automatiquement, ce qui remplace les étapes 3 à 6.

### Étape 3 — Vérifier que ça marche

Rendez-vous sur une page de fiche wiki SensCritique, par exemple en allant sur `https://www.senscritique.com/` puis en ouvrant l'édition d'une fiche existante (ou `https://old.senscritique.com/wiki`). Un panneau flottant intitulé **« Assistant fiche wiki »** doit apparaître en haut à droite de la page.

- Si le panneau apparaît : bravo, l'installation est terminée. Vous pouvez passer à la configuration des clés API ci-dessous si vous comptez traiter des films, séries, livres ou BD.
- Si rien n'apparaît : vérifiez que l'interrupteur du script est bien activé dans le tableau de bord Tampermonkey, et que vous êtes bien sur une URL `senscritique.com`. Un rafraîchissement de la page (`F5`) peut aussi être nécessaire juste après l'installation.

---

## Configuration des API

Le script utilise des services externes pour rechercher les informations des œuvres. **Jeu vidéo ne nécessite aucune configuration** (l'API Steam utilisée ne demande pas de clé). Les autres types demandent une clé API personnelle, gratuite, à récupérer une seule fois.

### Clé API TMDB (obligatoire pour Film / Série)

La recherche pour les types « Film » et « Série TV » utilise l'API de [TMDB (The Movie Database)](https://www.themoviedb.org/), qui nécessite une clé API personnelle et gratuite (obtenue en quelques minutes).

1. Allez sur https://www.themoviedb.org/signup et créez un compte gratuit (email + mot de passe). Confirmez votre email si on vous le demande, puis connectez-vous.
2. Une fois connecté, cliquez sur votre avatar/nom en haut à droite du site, puis sur **Paramètres** (ou allez directement sur https://www.themoviedb.org/settings/api).
3. Dans le menu de gauche de la page Paramètres, cliquez sur **API**.
4. Cliquez sur le bouton **Créer** (ou **Demander une clé API**).
5. Il vous demande le type d'usage : choisissez **Développeur**.
6. Un formulaire s'affiche (nom de l'application, URL du site, résumé de l'utilisation…). Vous pouvez répondre simplement, par exemple :
   - Type d'application : *Personal/Non commercial*
   - Nom de l'application : `Assistant fiche wiki SensCritique` (ou ce que vous voulez)
   - URL de l'application : vous pouvez mettre l'URL de ce dépôt GitHub, ou celle de SensCritique
   - Résumé d'utilisation : « Script personnel pour pré-remplir des fiches wiki sur SensCritique, usage non commercial »
7. Validez le formulaire. TMDB affiche alors votre clé API.
8. Sur la page qui s'affiche, repérez la ligne **« Clé API (v3 auth) »** (une longue suite de lettres/chiffres) — cliquez dessus pour la sélectionner, puis copiez-la (`Ctrl+C` / `Cmd+C`).
9. Retournez sur SensCritique, sur la page où le panneau flottant du script est visible. Cliquez sur l'icône ⚙️ **Options** du panneau.
10. Collez la clé (`Ctrl+V` / `Cmd+V`) dans le champ **« Clé API TMDB »**, puis cliquez sur **Sauver**.

C'est terminé : la recherche « Film » et « Série TV » fonctionne désormais. Vous n'avez à faire cette manipulation qu'une seule fois — la clé reste enregistrée dans votre navigateur.

La clé est mémorisée uniquement dans le `localStorage` de votre navigateur, sur votre ordinateur — elle n'est jamais envoyée à un tiers autre que l'API TMDB elle-même.

### Clé API Google Books (optionnelle, pour Livre / BD)

La recherche pour « Livre » et « BD » utilise l'[API Google Books](https://developers.google.com/books), qui fonctionne **sans clé** grâce à un quota anonyme partagé — **vous pouvez donc l'utiliser directement, sans rien configurer**.

Si vous rencontrez souvent un message d'erreur de type « quota dépassé » (cela peut arriver si beaucoup d'utilisateurs de Tampermonkey partagent le même quota anonyme), vous pouvez créer votre propre clé gratuite. C'est un peu plus long que pour TMDB mais reste accessible sans connaissances techniques :

1. Allez sur https://console.cloud.google.com/ et connectez-vous avec un compte Google (Gmail) existant, ou créez-en un.
2. Si c'est la première fois que vous utilisez la Google Cloud Console, acceptez les conditions d'utilisation qui s'affichent (pas besoin de renseigner de carte bancaire ni d'activer un essai payant pour ce qui suit).
3. En haut de la page, à côté du logo « Google Cloud », cliquez sur le sélecteur de projet (il affiche « Sélectionner un projet » ou le nom d'un projet existant).
4. Dans la fenêtre qui s'ouvre, cliquez sur **Nouveau projet**.
5. Donnez-lui un nom, par exemple `senscritique-assistant`, laissez le reste par défaut, puis cliquez sur **Créer**. Attendez quelques secondes que le projet soit prêt, puis sélectionnez-le (via le même sélecteur en haut de la page).
6. Une fois le projet sélectionné, allez sur https://console.cloud.google.com/apis/library/books.googleapis.com (cela ouvre directement la fiche de l'API Google Books).
7. Cliquez sur le bouton **Activer** (« Enable »). Attendez que la page confirme que l'API est activée.
8. Allez ensuite dans **Identifiants** (menu de gauche « APIs & Services » → « Identifiants », ou directement https://console.cloud.google.com/apis/credentials).
9. Cliquez sur **+ Créer des identifiants** en haut de la page, puis choisissez **Clé API**.
10. Une fenêtre affiche votre nouvelle clé (une longue suite de lettres/chiffres). Cliquez sur l'icône de copie pour la copier, puis sur **Fermer**.
11. *(Optionnel mais recommandé)* Cliquez sur le nom de la clé dans la liste pour l'ouvrir, puis dans **Restrictions relatives à l'API**, choisissez **Restreindre la clé** et cochez uniquement **Books API**. Cela empêche la clé d'être utilisée pour autre chose que la recherche de livres si elle venait à fuiter. Cliquez sur **Enregistrer**.
12. Retournez sur SensCritique, cliquez sur l'icône ⚙️ **Options** du panneau flottant du script.
13. Collez la clé dans le champ **« Clé API Google Books »**, puis cliquez sur **Sauver**.

Comme pour TMDB, cette manipulation n'est à faire qu'une seule fois : la clé est mémorisée uniquement dans le `localStorage` de votre navigateur, sur votre ordinateur, et n'est jamais envoyée à un tiers autre que l'API Google Books elle-même.

Note : Google Books ne distingue pas toujours scénariste et dessinateur pour les BD/mangas ; le script répartit les auteurs de façon heuristique et signale le résultat comme à vérifier manuellement.

### Et la clé SensCritique elle-même ?

Aucune manipulation n'est nécessaire : la vérification de doublon sur SensCritique (avant de proposer une nouvelle fiche) est faite automatiquement, sans clé à saisir — elle est détectée directement depuis la page que vous consultez (voir la section conformité ci-dessous pour le détail).

---

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

### Google Books — conforme

L'[API Google Books](https://developers.google.com/books) est une API publique de Google, couverte par ses conditions d'utilisation standard. Elle fonctionne sans clé (quota anonyme partagé) ou avec une clé personnelle gratuite. Usage ici en lecture seule, conforme à l'usage prévu de l'API (recherche d'ouvrages). Comme pour TMDB, seule la clé API que **vous** saisissez éventuellement est mémorisée localement, jamais les données renvoyées par l'API.

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
