# senscritique-assistant

Script à utiliser via Tampermonkey dans votre navigateur pour simplifier le processus de création de fiches wiki sur SensCritique (recherche automatique sur Steam/TMDB, pré-remplissage des champs du formulaire, aperçu et upload de la jaquette).

## Avertissement

Ce projet est **non officiel** et **indépendant**. Son auteur n'est ni propriétaire, ni affilié, ni partenaire de SensCritique ni de la marque « SensCritique » ou du site senscritique.com. « SensCritique » reste la propriété de ses détenteurs respectifs. Ce script se contente d'interagir avec le formulaire d'édition de fiche wiki tel qu'exposé publiquement par le site, à des fins personnelles et non commerciales (voir [license.md](license.md)).

Le script ne publie ni n'enregistre jamais rien automatiquement sur SensCritique : il ne fait que pré-remplir les champs du formulaire, à vous de vérifier et de valider avant publication.

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

La clé est mémorisée uniquement dans le `localStorage` de votre navigateur, sur votre ordinateur — elle n'est jamais envoyée à un tiers autre que l'API TMDB elle-même. La recherche pour « Jeu vidéo » (via l'API Steam) ne nécessite aucune clé.

## Licence

Voir [license.md](license.md) (PolyForm Noncommercial License 1.0.0 — usage non commercial uniquement).
