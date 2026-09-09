import {readFileSync} from 'node:fs';
export const heroAtlas=JSON.parse(readFileSync(new URL('../../public/mariomortille/characters/aurelien/gameplay/hero-atlas.json',import.meta.url),'utf8'));
export const heroAtlasHas=pose=>Boolean(heroAtlas.frames[pose]);
