// Original hand-authored pixel art. Every character is one deliberately placed pixel.
// '.' is transparent. Frames below move specific pixels; no generated imagery.
export const palette: Record<string, string> = {
  '.': 'transparent',
  F: '#302d30', f: '#191a20', m: '#8f8580', N: '#30272a', G: '#145a36', j: '#33994e',
  o: '#18343e',
  s: '#a3c8c9',
  d: '#79a6ad',
  w: '#edf1dc',
  l: '#d7e8d9',
  b: '#b8d4cc',
  e: '#102c39',
  a: '#faad69',
  r: '#dc7955',
  h: '#ead2a1',
  y: '#f4d689',
  g: '#98c790',
  v: '#b6a0d7',
  p: '#df8f85',
  n: '#537983',
  c: '#86c4cc',
  k: '#365a61',
};
const raw: Record<string, string[]> = {
  gorilla: [
    '........GGGGGGGG........',
    '.......GjjjjjjjjG.......',
    '......GjjjwjjjjjjG......',
    '......GjjjwjjjjjjG......',
    '......GjjjwwwjjjjG......',
    '.....GGGGGGGGGGGGGG....',
    '....ffFFFFFFFFFFFFff....',
    '...fFFFFmmmmmmFFFFFf....',
    '..ffFFFmmwemmewmFFFff...',
    '..fmFFFmmwemmewmFFFmf...',
    '..ffFFFmmmmmmmmFFFFff...',
    '...fFFFmmNNNNmmFFFf....',
    '....FFFmmmmmmmmFFF.....',
    '....FFFmmmNNmmmFFF.....',
    '...FFFFFFFFFFFFFFFF....',
    '..FFFFFmmmmmmFFFFFf.....',
    '.fFFFFFmmmmmmFFFFFFf....',
    '.FFFFFmmmmmFmmFFFFFf....',
    '.FFFfFFmmmmmmFFfFFFf....',
    '.mmm.FFFFFFFFFF.mmm.....',
    '..mm.FFFFFFFFFF.mm......',
    '.....FFFF..FFFF.........',
    '....Fmmmm..mmmmF........',
    '....FFFFF..FFFFF........',
  ],
  drone: [
    '.....vvvvvvvvvv.....',
    '....vwwvvvvvvwwv....',
    '...vvvvoooooovvvv...',
    '..vvvvoyyoooyyovvv..',
    '.kvvvvoyyoooyyovvvk.',
    'kkkkkkkoooooookkkkkk',
    '.nnnvvvvvvvvvvvnnn..',
    '....vvvvvvvvvvvv....',
    '.....vnnnnnnnnv.....',
    '......nvvnnvvn......',
    '......n..nn..n......',
    '.....nn......nn.....',
  ],
  energy: [
    '...yyyy...',
    '..yhwwhy..',
    '.yhwyywhy.',
    '.ywyyywwy.',
    'yhwyyowwhy',
    'yhyyooowhy',
    'yhwooooyhy',
    'yhwyyoywhy',
    '.ywwyyywy.',
    '.yhwwwwhy.',
    '..yhhhhy..',
    '...yyyy...',
  ],
  ship: [
    '..........yy..........',
    '..........yy..........',
    '.........llll.........',
    '.........lwwl.........',
    '........lwwwwl........',
    '.......llwcwwll.......',
    '......lllccccwll......',
    '....ggllccccccwllg....',
    '..ggglllccccccwllggg..',
    '.ggggllwwwwwwwwllgggg.',
    'gggggllllaaaallllggggg',
    'gggggllllarraalllggggg',
    '..kkkkk..rrrr..kkkkk..',
    '.........ayya.........',
    '..........yy..........',
  ],
  pac: [
    '....yyyyyy....',
    '..yywwwwyyyy..',
    '.ywwwyyyyyyyy.',
    '.ywwyyyeyyyyy.',
    'ywwyyyyeeyyyyy',
    'ywwyyyyyyyyy..',
    'ywwyyyyyyy....',
    'ywwyyyyy......',
    'ywwyyyyyyy....',
    'ywwyyyyyyyyy..',
    '.ywwyyyyyyyyy.',
    '.ywwyyyyyyyyy.',
    '..yywwyyyyyy..',
    '....yyyyyy....',
  ],
  boiler: [
    '....nnnnnnnnnnnnnnnn....',
    '...nwwwwwwwwwwwwwwwwn...',
    '..nwwwwwwwwwwwwwwwwwwn..',
    '..nwwkkkkkkkkkkkkkkwwn..',
    '..nwwkggggggggggggkwwn..',
    '..nwwkggkggkggkgggkwwn..',
    '..nwwkkkkkkkkkkkkkkwwn..',
    '..nwwwwwwwwwwwwwwwwwwn..',
    '..nwwsssssssssssssswwn..',
    '..nwwssoooossscccsswwn..',
    '..nwwsoooyoosscccsswwn..',
    '..nwwsooooyooscccsswwn..',
    '..nwwsoooooyosssssswwn..',
    '..nwwsoooyoosssggsswwn..',
    '..nwwssoooossssgrsswwn..',
    '..nwwsssssssssssssswwn..',
    '..nwwwwwwwwwwwwwwwwwwn..',
    '..nwwnnwnnwnnwnnwnnwwn..',
    '..nwwwwwwwwwwwwwwwwwwn..',
    '..nbbbbbbbbbbbbbbbbbbn..',
    '...nnnnnnnnnnnnnnnnnn...',
    '......nn........nn......',
    '......nn........nn......',
    '......nn........nn......',
  ],
  house: [
    '............rr............',
    '...........raar...........',
    '..........raaaar..........',
    '.........raaaaaaar.........',
    '........raaaaaaaaar........',
    '.......raaaaaaaaaar........',
    '......raaaaaaaaaaaaar......',
    '.....rrrrrrrrrrrrrrrr.....',
    '.....lwwwwwwwwwwwwwwl.....',
    '.....lwwccccwwccccwwl.....',
    '.....lwwcwwcwwcwwcwwl.....',
    '.....lwwccccwwccccwwl.....',
    '.....lwwcwwcwwcwwcwwl.....',
    '.....lwwccccwwccccwwl.....',
    '.....lwwwwwwwwwwwwwwl.....',
    '.....lwwwwkkkkwwwwwwl.....',
    '.....lwwwwkcckwwwwwwl.....',
    '.....lwwwwkcckwwwwwwl.....',
    '.....lwwwwkcckwwwwwwl.....',
    '.....lwwwwkcykwwwwwwl.....',
    '.....lwwwwkcckwwwwwwl.....',
    '.....lllllkkkklllllll.....',
  ],
};
export const spriteNames = Object.keys(raw);
export function spritePixels(name: string, frame = 0): string[] {
  const source = raw[name] || raw.gorilla;
  const rows = source.map((s) =>
    s.padEnd(Math.max(...source.map((r) => r.length)), '.').split(''),
  );
  if (name === 'gorilla' && frame % 4) {
    const f = frame % 4;
    if (f === 1 || f === 3) {
      for (let y = 20; y < 24; y++) {
        const dx = f === 1 ? 1 : -1;
        rows[y] = rows[y].map(
          (_, x) => source[y][x + (x < 12 ? dx : -dx)] || '.',
        );
      }
    }
    if (f === 2) {
      rows[22] = rows[21].slice();
      rows[23] = source[22].split('');
    }
  }
  if (name === 'drone' && frame % 2) {
    rows[10] = '....nnn......nnn....'.padEnd(rows[0].length, '.').split('');
    rows[11] = '...nn..........nn...'.padEnd(rows[0].length, '.').split('');
  }
  if (name === 'pac' && frame % 2) {
    for (let y = 5; y < 10; y++) for (let x = 8; x < 13; x++) rows[y][x] = 'y';
  }
  return rows.map((r) => r.join(''));
}
const cache = new Map<string, HTMLCanvasElement>();
export function drawSprite(
  c: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  scale = 2,
  frame = 0,
  flip = false,
) {
  const key = `${name}-${frame % 4}`;
  let sprite = cache.get(key);
  if (!sprite) {
    const pixels = spritePixels(name, frame);
    sprite = document.createElement('canvas');
    sprite.width = Math.max(...pixels.map((r) => r.length));
    sprite.height = pixels.length;
    const ctx = sprite.getContext('2d')!;
    pixels.forEach((row, py) =>
      row.split('').forEach((v, px) => {
        if (v !== '.') {
          ctx.fillStyle = palette[v];
          ctx.fillRect(px, py, 1, 1);
        }
      }),
    );
    cache.set(key, sprite);
  }
  c.save();
  c.imageSmoothingEnabled = false;
  c.translate(Math.round(x), Math.round(y));
  if (flip) c.scale(-1, 1);
  c.drawImage(
    sprite,
    -Math.round((sprite.width * scale) / 2),
    -Math.round((sprite.height * scale) / 2),
    Math.round(sprite.width * scale),
    Math.round(sprite.height * scale),
  );
  c.restore();
}
export function drawAtlas(c: CanvasRenderingContext2D) {
  spriteNames.forEach((name, y) => {
    for (let frame = 0; frame < 4; frame++)
      drawSprite(c, name, 70 + frame * 120, 65 + y * 120, 3, frame);
  });
}
