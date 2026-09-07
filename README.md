# Mortille

Salle d’arcade 3D et jeux, dont Mariomortille. Copie de travail du 7 septembre 2026 ; certaines animations et fonctionnalités sont encore en cours de réalisation.

## Démarrer localement

Node.js 22.13 ou supérieur est nécessaire.

```sh
npm ci
npm run dev
```

Ouvrir http://localhost:3000. Les assets PNG, sons et modèles GLB sont dans `public/`. Les migrations de classement sont dans `drizzle/`. La base locale et les secrets ne sont pas inclus. Pour activer les classements, configurer D1 avec le binding `DB` et appliquer les migrations de `drizzle/` à cette base.

## Vérification

```sh
npx tsc --noEmit
node --import ./tests/mariomortille/register.mjs --test tests/mariomortille/*.test.mjs
npm run build
```

## GitHub

Le dépôt Git local est initialisé sans commit ni dépôt distant. Ajouter les fichiers, créer un commit puis choisir votre dépôt GitHub. Les dépendances, caches, builds et secrets locaux sont exclus par `.gitignore`.

La configuration `.openai/hosting.json` conserve le rattachement Sites existant ; elle contient des identifiants de configuration, pas de secret. Publier le code sur GitHub ne redéploie pas le site. Pour héberger ailleurs, adapter la configuration Cloudflare/D1.
