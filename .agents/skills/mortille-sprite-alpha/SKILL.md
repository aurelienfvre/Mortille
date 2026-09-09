---
name: mortille-sprite-alpha
description: Générer, découper et vérifier les sprites PNG de Mariomortille avec vraie transparence, proportions constantes et preview animée. À appliquer aux personnages, transformations, équipements, boss et effets de ce projet.
---

# Sprites Mariomortille

Lire ce skill avant toute nouvelle génération ou découpe. Il complète imagegen et sprite-pipeline ; il ne choisit pas un modèle non exposé par l'outil.

## Génération et alpha

- Utiliser une référence approuvée du même personnage et du même palier. Préserver palette, tenue, silhouette, volume de tête et membres. Générer le cycle complet, sans dupliquer un demi-cycle.
- Demander un PNG sur fond réellement transparent. `background: transparent` dans un prompt est une consigne, pas la preuve qu'un paramètre API a été transmis.
- La vraie transparence a déjà réussi ici. Vérifier le fichier obtenu AVANT de le montrer. Un RGB opaque, un damier dessiné ou un fond coloré ne sont pas acceptables, même avec l'extension PNG.
- Si nécessaire, refaire une édition imagegen dédiée : « Remove the gray checkerboard background from this image. Return the sprites isolated on a genuinely transparent background, with an alpha channel. Keep the sprites unchanged, including all white shoes, white shirt and white feathers. No replacement background. » Adapter uniquement les éléments présents.
- Ne jamais supprimer globalement une couleur : le blanc des yeux, des mains, des vêtements et des chaussures doit rester intact. Ne pas transformer le damier en alpha par une sélection globale de gris.
- Contrôler mode et alpha avec `scripts/check_png.py --source fichier.png`. Le succès numérique ne prouve pas l'absence de damier résiduel dans les zones opaques.

## Découpe sans fragment voisin

1. Inspecter la planche et définir les rectangles source réels. Une grille annoncée dans le prompt ne garantit pas des cellules exactes.
2. Chaque rectangle doit inclure le personnage entier et seulement cette pose : doigts, pied, sabre, ailes, queue et effets attachés. Si deux poses se chevauchent, faire corriger la source ; ne pas couper un membre pour forcer la grille.
3. Exporter dans des canevas identiques, avec une échelle commune et une ancre fixe (pieds ou bassin selon l'action). Déplacer la pose pour corriger l'alignement ; ne pas redimensionner chaque pose à sa propre boîte englobante.
4. Garder une marge transparente autour du contenu. Pour un atlas, ajouter des gouttières transparentes ; faire correspondre exactement rectangles du JSON et pixels exportés. L'ancre au sol n'est pas nécessairement le bord de la cellule.
5. Après normalisation pixel art, alpha uniquement 0/255 et RGB nul sous alpha0. Exécuter `scripts/check_png.py frame-*.png` ; il signale les bords touchés et les doublons, mais ne les répare pas.

## Revue obligatoire

- Examiner CHAQUE pose sur fond uni blanc et sombre, puis en animation lente et à vitesse réelle. Ces fonds appartiennent uniquement à la preview, jamais aux fichiers PNG.
- Vérifier trous, halo, quadrillage résiduel, fragment d'une pose voisine, membre coupé, changement de volume, ancre instable. Le test alpha ne détecte pas ces défauts à lui seul.
- Marche/sprint : vérifier contact, compression, passage et extension pour CHAQUE jambe. Les poses 1 et 5 doivent inverser le rôle des jambes ; bras opposés et genoux pliés. Vérifier aussi la transition dernière→première.
- Preview : lecture/pause, pose suivante, vitesse, fond clair/sombre, timings réels. Distinguer « à corriger », « préparé non intégré » et « intégré ». Ne jamais remplir une case manquante avec un idle ou un autre pouvoir.
- Avant intégration, vérifier les rectangles et les clés dans le moteur, y compris état équipé et transitions. Conserver un rapport des limites restantes. Une source réussie n'autorise pas à déclarer toutes les suivantes conformes.
