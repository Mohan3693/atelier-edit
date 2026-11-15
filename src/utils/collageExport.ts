import type { OutfitOption, OutfitPiece, WardrobeItem } from '../types/stylist';
import { normalizeHexColor } from './stylist';

function loadHtmlImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const boxRatio = w / Math.max(1, h);
  let drawW = w;
  let drawH = h;
  if (imgRatio > boxRatio) {
    drawH = w / imgRatio;
  } else {
    drawW = h * imgRatio;
  }
  const dx = x + (w - drawW) / 2;
  const dy = y + (h - drawH) / 2;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

export async function renderOutfitCollageDataUrl(
  outfit: OutfitOption,
  closetItems: WardrobeItem[],
): Promise<string> {
  const width = 1200;
  const height = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Seamless warm alabaster studio paper backdrop
  ctx.fillStyle = '#F8F8F7';
  ctx.fillRect(0, 0, width, height);

  // Editorial header block
  const margin = 64;
  ctx.fillStyle = '#9E1B32';
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${outfit.occasion.toUpperCase()}  ·  CURATED FROM YOUR CLOSET`, margin, 86);

  ctx.fillStyle = '#141413';
  ctx.font = '600 56px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(outfit.title.slice(0, 42), margin, 150);

  ctx.strokeStyle = '#E4E4E7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, 180);
  ctx.lineTo(width - margin, 180);
  ctx.stroke();

  const itemMap = new Map(closetItems.map((i) => [i.id, i]));
  const piecesWithImg: Array<OutfitPiece & { resolvedImg?: string }> = outfit.pieces
    .map((p) => {
      const found = p.wardrobeItemId ? itemMap.get(p.wardrobeItemId) : undefined;
      return {
        ...p,
        resolvedImg: found?.imageUrl ?? p.imageUrl,
      };
    })
    .slice(0, 6);

  const loadedImages = await Promise.all(
    piecesWithImg.map((p) => (p.resolvedImg ? loadHtmlImage(p.resolvedImg) : Promise.resolve(null))),
  );

  // Editorial grid geometry inside [margin, 212 .. width-margin, 1460]
  const areaX = margin;
  const areaY = 216;
  const areaW = width - margin * 2;
  const areaH = 1220;
  const gap = 24;

  const count = piecesWithImg.length;
  interface TileRect {
    x: number;
    y: number;
    w: number;
    h: number;
  }
  const rects: TileRect[] = [];

  if (count <= 2) {
    const colW = (areaW - gap) / 2;
    for (let i = 0; i < count; i++) {
      rects.push({ x: areaX + i * (colW + gap), y: areaY, w: colW, h: areaH });
    }
  } else if (count === 3) {
    const leftW = Math.round(areaW * 0.56);
    const rightW = areaW - leftW - gap;
    const rightH = (areaH - gap) / 2;
    rects.push({ x: areaX, y: areaY, w: leftW, h: areaH });
    rects.push({ x: areaX + leftW + gap, y: areaY, w: rightW, h: rightH });
    rects.push({ x: areaX + leftW + gap, y: areaY + rightH + gap, w: rightW, h: rightH });
  } else if (count === 4) {
    const colW = (areaW - gap) / 2;
    const rowH = (areaH - gap) / 2;
    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      rects.push({
        x: areaX + col * (colW + gap),
        y: areaY + row * (rowH + gap),
        w: colW,
        h: rowH,
      });
    }
  } else {
    // 5 or 6 items: 2 large apparel tiles top row + 3 or 4 accessory/shoe tiles bottom row
    const topH = Math.round(areaH * 0.56);
    const botH = areaH - topH - gap;
    const topW = (areaW - gap) / 2;
    rects.push({ x: areaX, y: areaY, w: topW, h: topH });
    rects.push({ x: areaX + topW + gap, y: areaY, w: topW, h: topH });
    const botCount = count - 2;
    const botW = (areaW - gap * (botCount - 1)) / botCount;
    for (let i = 0; i < botCount; i++) {
      rects.push({
        x: areaX + i * (botW + gap),
        y: areaY + topH + gap,
        w: botW,
        h: botH,
      });
    }
  }

  piecesWithImg.forEach((piece, idx) => {
    const r = rects[idx];
    if (!r) return;

    // White gallery card
    ctx.save();
    drawRoundedRect(ctx, r.x, r.y, r.w, r.h, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#E4E4E7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.clip();

    const footerH = 88;
    const imgPad = 24;
    const imgBoxX = r.x + imgPad;
    const imgBoxY = r.y + imgPad;
    const imgBoxW = r.w - imgPad * 2;
    const imgBoxH = Math.max(80, r.h - footerH - imgPad * 1.5);

    const img = loadedImages[idx];
    if (img) {
      drawImageContain(ctx, img, imgBoxX, imgBoxY, imgBoxW, imgBoxH);
    } else {
      ctx.fillStyle = normalizeHexColor(piece.colorHex, '#EEEDE6');
      drawRoundedRect(ctx, imgBoxX, imgBoxY, imgBoxW, imgBoxH, 12);
      ctx.fill();
    }

    // Card footer label
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(r.x, r.y + r.h - footerH, r.w, footerH);
    ctx.strokeStyle = '#EFEFEF';
    ctx.beginPath();
    ctx.moveTo(r.x, r.y + r.h - footerH);
    ctx.lineTo(r.x + r.w, r.y + r.h - footerH);
    ctx.stroke();

    // Swatch square
    ctx.fillStyle = normalizeHexColor(piece.colorHex);
    drawRoundedRect(ctx, r.x + 22, r.y + r.h - footerH + 22, 18, 18, 4);
    ctx.fill();

    ctx.fillStyle = '#787772';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(piece.slot.toUpperCase(), r.x + 50, r.y + r.h - footerH + 37);

    ctx.fillStyle = '#141413';
    ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(piece.name.slice(0, 26), r.x + 22, r.y + r.h - 20);

    ctx.restore();
  });

  // Bottom color palette & branding strip
  const footerY = 1480;
  ctx.fillStyle = '#575652';
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Atelier Edit  ·  Personal Wardrobe Lookbook', margin, footerY + 46);

  // Swatch bar on bottom right
  const swatchSize = 36;
  const totalSwatchesW = piecesWithImg.length * (swatchSize + 10) - 10;
  let sx = width - margin - totalSwatchesW;
  for (const piece of piecesWithImg) {
    ctx.fillStyle = normalizeHexColor(piece.colorHex);
    drawRoundedRect(ctx, sx, footerY + 18, swatchSize, swatchSize, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,19,0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    sx += swatchSize + 10;
  }

  return canvas.toDataURL('image/png');
}
