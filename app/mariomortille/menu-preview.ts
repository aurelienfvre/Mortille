import { bitmapText, menuTitle, menuSubtitle, menuFooter, menuLabels, menuBackground, menuIdleFrame } from './menu-art';

/** Passive TV title screen sharing the actual menu's PNGs, alphabet and labels. */
export function createMenuPreview(width: number, height: number) {
  const images = new Map<string, HTMLImageElement>();
  let elapsed = 0, disposed = false;
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function asset(path: string) {
    let image = images.get(path);
    if (!image && !disposed) { image = new Image(); image.src = path; images.set(path, image); }
    return image?.complete && image.naturalWidth ? image : undefined;
  }
  function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number, color: string, title = false) {
    const { pixels, width: units } = bitmapText(text);
    const scale = Math.min(w / units, h / (title ? 11 : 9));
    const left = x + (w - units * scale) / 2 + scale;
    const top = y + (h - (title ? 11 : 9) * scale) / 2 + scale;
    const paint = (fill: string, dx: number, dy: number, size: number, topOnly = false) => {
      ctx.fillStyle = fill;
      for (const p of pixels) if (!topOnly || p.y === 0) ctx.fillRect(Math.round(left + (p.x + dx) * scale), Math.round(top + (p.y + dy) * scale), Math.ceil(scale * size), Math.ceil(scale * size));
    };
    if (title) { paint('#172124', -1, -1, 3); paint('#885010', 0, 2, 1); }
    paint(color, 0, 0, 1);
    if (title) paint('#ffd477', 0, 0, 1, true);
  }
  for (let i = 1; i <= 8; i++) asset(`/mariomortille/menu/aurelien/idle-${String(i).padStart(2, '0')}.png`);
  asset(menuBackground);
  asset('/mariomortille/menu/cloud-1.png'); asset('/mariomortille/menu/cloud-2.png');
  return {
    update: (dt: number) => { if (!disposed && !reduced) elapsed += Math.max(0, Math.min(dt, .1)) * 1000; },
    draw: (ctx: CanvasRenderingContext2D) => {
      if (disposed) return;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#438dbc'; ctx.fillRect(0, 0, width, height);
      const background = asset(menuBackground);
      if (background) { const s = Math.max(width / background.width, height / background.height); ctx.drawImage(background, (width - background.width * s) / 2, height - background.height * s, background.width * s, background.height * s); }
      for (let i = 0; i < 2; i++) {
        const cloud = asset(`/mariomortille/menu/cloud-${i + 1}.png`);
        if (!cloud) continue;
        const phase = reduced ? 0 : ((elapsed + i * 35000) % (i ? 70000 : 48000)) / (i ? 70000 : 48000);
        const w = width * (i ? .17 : .24);
        ctx.globalAlpha = .9;
        ctx.drawImage(cloud, Math.round(width * ((i ? -.15 : .38) - .25 + phase * .9)), height * (i ? .03 : .26), w, w * cloud.height / cloud.width);
      }
      ctx.globalAlpha = 1;
      const hero = asset(`/mariomortille/menu/aurelien/idle-${String(menuIdleFrame(elapsed) + 1).padStart(2, '0')}.png`);
      if (hero) ctx.drawImage(hero, width * .15, height * .9 - width * .12, width * .12, width * .12);
      for (let i = 0; i < 12; i++) {
        const phase = reduced ? .4 : ((elapsed / 1000 + i * 1.3) % (8 + i % 4)) / (8 + i % 4);
        ctx.fillStyle = i % 3 === 0 ? '#8ccd7a' : '#ffe3a0';
        ctx.globalAlpha = reduced ? .6 : Math.min(1, phase * 5, (1 - phase) * 4) * .8;
        ctx.fillRect(Math.round(width * ((i * 37 + 9) % 100) / 100 + phase * 15), Math.round(height * ((i * 17 + 13) % 75) / 100 - phase * 30), i % 3 ? 3 : 4, 2);
      }
      ctx.globalAlpha = 1;
      label(ctx, menuTitle, width * .08, height * .05, width * .84, height * .19, '#ffae22', true);
      label(ctx, menuSubtitle, width * .248, height * .24, width * .504, height * .04, '#fff5d7');
      const x = width * .29, w = width * .42, gap = height * .007, row = (height * .49 - gap * 6) / 7;
      menuLabels.forEach((text, i) => {
        const y = height * .37 + i * (row + gap);
        ctx.fillStyle = i === 0 ? '#161c1f' : i === 2 ? '#274858b8' : '#152e3cbf'; ctx.fillRect(x, y, w, row);
        if (i === 0) { ctx.strokeStyle = '#ffae22'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, row); }
        label(ctx, text, x + w * .05, y + 4, w * .9, row - 8, i === 0 ? '#ffd583' : i === 2 ? '#8da5ad' : '#fff6d6');
      });
      ctx.fillStyle = '#235f28'; ctx.fillRect(0, height * .9, width, height * .1);
      ctx.fillStyle = '#429931'; ctx.fillRect(0, height * .9, width, 3);
      label(ctx, menuFooter, width * .13, height * .93, width * .74, height * .035, '#c2ddb0');
      ctx.restore();
    },
    dispose: () => { disposed = true; images.clear(); },
  };
}
