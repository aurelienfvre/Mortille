# Bruitages utilisés — CC0

Les extraits ont été découpés, convertis en WAV mono et leur niveau ajusté.

- button.wav : Kenney, 51 UI sound effects, switch4.wav — https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks
- slide.wav : Kenney, 50 RPG sound effects, metalLatch.ogg — https://opengameart.org/content/50-rpg-sound-effects
- confirm.wav : Kenney, Interface Sounds, confirmation_002.ogg — https://kenney.nl/assets/interface-sounds
- latch.wav, motor.wav : Solar01, Cassette Tape Insert Rewind.WAV, extraits du MP3 de préécoute public — https://freesound.org/people/Solar01/sounds/662965/
- crt-on.wav, crt-off.wav : kyles, monitor computer CRT on, off.flac, extraits du MP3 de préécoute public — https://freesound.org/people/kyles/sounds/454090/

Licence de tous ces enregistrements : CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/

- suction.wav : montage original de knifeSlice2.ogg de Kenney (50 RPG Sound Effects, CC0), ralenti/inversé, avec souffle filtré et grave synthétisés. Stéréo de 1,65 s, crescendo calé sur la plongée (5,95 à 7,60 s). Source : https://opengameart.org/content/50-rpg-sound-effects

- release.wav : variante inversée et adoucie du montage suction.wav, pour le souffle de retour hors du jeu ; même source Kenney CC0 et couches synthétisées.

## Foley des boîtiers et du disque

Ces quatre montages mono PCM 16 bits / 44,1 kHz réutilisent exclusivement les enregistrements CC0 déjà présents ci-dessus. Coupes des transitoires, changements de vitesse, filtrage et fondus ; aucun échantillon commercial ajouté.

- **case-open.wav** (0,20 s) : deux couches décalées de `button.wav`, issu de `switch4.wav` — Kenney, [51 UI sound effects](https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks), CC0.
- **case-hinge.wav** (0,35 s) : queue de frottement de `slide.wav`, sans l'attaque métallique, ralentie et filtrée — Kenney, `metalLatch.ogg`, [50 RPG sound effects](https://opengameart.org/content/50-rpg-sound-effects), CC0.
- **disc-clip.wav** (0,12 s) : transitoire court de `button.wav`, accéléré et filtré — Kenney, `switch4.wav`, [51 UI sound effects](https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks), CC0.
- **case-close.wav** (0,18 s) : extrait raccourci et accéléré de `latch.wav`, avec une couche discrète de `button.wav` — Solar01, [Cassette Tape Insert Rewind](https://freesound.org/people/Solar01/sounds/662965/), et Kenney, [51 UI sound effects](https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks), CC0.

Script reproductible : `work/audio-library/prepare_case_foleys.py`. Mesures : `work/audio-library/case-foleys-report.json`.
