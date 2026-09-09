# Directives permanentes — Mariomortille

Les sprites doivent être des PNG à véritable transparence, jamais un quadrillage
dessiné ou un fond opaque déguisé en PNG. Cette exigence vient explicitement de
l’utilisateur et s’applique à tous les agents.

La vraie transparence a DÉJÀ ÉTÉ RÉUSSIE dans ce projet. Ne pas prétendre qu’elle
est impossible ni accepter un quadrillage comme limitation inévitable. Réutiliser
les réussites : `assets-source/bear/stage1-cloud-jump/source-original.png` possède
un vrai canal RGBA et ses exports sous `public/mariomortille/party/juju/bear/stage1/cloud/`
ont un alpha binaire. L’édition imagegen dédiée « Remove the gray checkerboard
background ... genuinely transparent background, with an alpha channel ... keep
white feathers, white shoes and white shirt ... no replacement background » a
fonctionné. S’en servir comme méthode éprouvée, puis contrôler chaque sortie ;
une réussite antérieure ne dispense jamais des vérifications ci-dessous.

Avant toute livraison ou intégration :

Ne pas afficher les brouillons opaques : lire le mode et l’alpha AVANT de montrer
une nouvelle génération dans le chat ou la galerie. Garder les rejets en travail.

1. Vérifier le canal alpha du fichier réellement généré. Rejeter tout fond opaque
   ou quadrillage incrusté ; utiliser une édition imagegen de retrait du fond si
   nécessaire, puis revérifier. Un prompt « transparent » ne prouve pas le résultat.
2. Normaliser les sprites pixel art avec alpha uniquement 0/255 et RGB nul hors
   du sujet. Préserver les blancs légitimes et ne jamais effacer une couleur dans
   tout le personnage.
3. Examiner chaque pose sur fond uni clair et sombre : aucun halo, résidu de fond,
   trou dans les mains/vêtements/corps ni partie coupée. Le canal alpha seul ne
   garantit pas un détourage correct.
4. Fournir une preview animée fidèle. Les fonds de contrôle restent dans la page,
   jamais dans les PNG exportés. Ne pas afficher un brouillon comme asset terminé.
5. Conserver proportions, échelle commune, ancre et vrai cycle complet : les deux
   jambes passent devant alternativement, pas un demi-cycle répété.

Valable pour personnages, formes, équipements, objets et effets. Synchroniser les
fichiers validés dans le dossier Git Perso/Mortille sans écraser les modifications
utilisateur. Ne pas intégrer d’animation connue comme incorrecte.

## Skill obligatoire pour les sprites

Avant toute génération, découpe, preview ou intégration de sprites, lire et appliquer `.agents/skills/mortille-sprite-alpha/SKILL.md`. Le contrôle numérique ne remplace pas la revue visuelle de chaque pose ni celle des rectangles d’atlas.
