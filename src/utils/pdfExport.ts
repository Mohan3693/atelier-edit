import type { ItemAnalysis, OutfitOption } from '../types/stylist';
import { getOutfitPaletteCategory, normalizeHexColor } from './stylist';

export function buildPdfLookbookFilename(itemName: string): string {
  const slug = (itemName || 'wardrobe-piece')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `outfitvault-${slug || 'lookbook'}.pdf`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = normalizeHexColor(hex, '#141413').slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export interface PdfOutfitPageModel {
  kicker: string;
  title: string;
  moodSummary: string;
  colorHarmonyNote: string;
  flatLayImageUrl: string | null;
  pieces: Array<{
    slot: string;
    name: string;
    colorName: string;
    colorHex: string;
    material: string;
    stylingTip: string;
  }>;
}

export function buildPdfOutfitModels(
  outfits: OutfitOption[],
  analysis: ItemAnalysis,
): PdfOutfitPageModel[] {
  return outfits.map((outfit, idx) => {
    const paletteCategory = getOutfitPaletteCategory(outfit, analysis.palette);
    return {
      kicker: `${outfit.occasion} · Look 0${idx + 1} · ${paletteCategory}`,
      title: outfit.title,
      moodSummary: outfit.moodSummary,
      colorHarmonyNote: outfit.colorHarmonyNote,
      flatLayImageUrl: outfit.flatLayImageUrl,
      pieces: outfit.pieces.map((p) => ({
        slot: p.slot,
        name: p.name,
        colorName: p.colorName,
        colorHex: normalizeHexColor(p.colorHex),
        material: p.material,
        stylingTip: p.stylingTip,
      })),
    };
  });
}

async function loadImageForPdf(
  url: string,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });

    const maxDim = 1000;
    const scale = Math.min(1, maxDim / Math.max(loaded.naturalWidth, loaded.naturalHeight));
    const width = Math.max(1, Math.round(loaded.naturalWidth * scale));
    const height = Math.max(1, Math.round(loaded.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(loaded, 0, 0, width, height);
    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.88),
      width,
      height,
    };
  } catch {
    return null;
  }
}

export async function exportOutfitsToPdf(params: {
  analysis: ItemAnalysis;
  anchorImageUrl: string;
  outfits: OutfitOption[];
}): Promise<{ filename: string; pageCount: number }> {
  const { jsPDF } = await import('jspdf');
  const { analysis, anchorImageUrl, outfits } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageW - margin * 2;

  // Cover / Anchor Garment Summary Page
  doc.setFillColor(248, 248, 247);
  doc.rect(0, 0, pageW, 297, 'F');

  doc.setTextColor(87, 86, 82);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('OUTFITVAULT · PERSONAL WARDROBE LOOKBOOK', margin, 20);

  doc.setTextColor(20, 20, 19);
  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  const titleLines = doc.splitTextToSize(analysis.itemName, contentW);
  doc.text(titleLines, margin, 32);

  let y = 32 + titleLines.length * 10 + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(87, 86, 82);
  doc.text(`${analysis.category} · ${analysis.stylePersonality}`, margin, y);
  y += 8;

  const anchorImg = await loadImageForPdf(anchorImageUrl);
  if (anchorImg) {
    const boxW = 78;
    const boxH = Math.min(96, (anchorImg.height / anchorImg.width) * boxW);
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, boxW, boxH, 'F');
    doc.addImage(anchorImg.dataUrl, 'JPEG', margin, y, boxW, boxH);

    const textX = margin + boxW + 8;
    const textW = contentW - boxW - 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 19);
    doc.text('Styling Strategy', textX, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(87, 86, 82);
    const stratLines = doc.splitTextToSize(analysis.stylingStrategy, textW);
    doc.text(stratLines, textX, y + 12);

    let metaY = y + 12 + stratLines.length * 4.8 + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 19);
    doc.text('Silhouette & Textile', textX, metaY);
    metaY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(87, 86, 82);
    const specLines = doc.splitTextToSize(
      `${analysis.silhouette}. ${analysis.fabricAndTexture}.`,
      textW,
    );
    doc.text(specLines, textX, metaY);

    y += Math.max(boxH, metaY - y + specLines.length * 4.5) + 12;
  }

  // Color Palette Swatches
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 19);
  doc.text('Extracted Color Palette', margin, y);
  y += 5;

  const swatchGap = 4;
  const swatchCount = Math.max(1, Math.min(5, analysis.palette.length));
  const swatchW = (contentW - swatchGap * (swatchCount - 1)) / swatchCount;

  analysis.palette.slice(0, 5).forEach((swatch, i) => {
    const sx = margin + i * (swatchW + swatchGap);
    const { r, g, b } = hexToRgb(swatch.hex);
    doc.setFillColor(r, g, b);
    doc.rect(sx, y, swatchW, 12, 'F');
    doc.setDrawColor(228, 228, 231);
    doc.rect(sx, y, swatchW, 12, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 19);
    doc.text(swatch.name.slice(0, 16), sx, y + 17);

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(87, 86, 82);
    doc.text(normalizeHexColor(swatch.hex), sx, y + 21);
  });

  // Individual Outfit Pages
  const outfitModels = buildPdfOutfitModels(outfits, analysis);

  for (const model of outfitModels) {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, 297, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(158, 27, 50);
    doc.text(model.kicker, margin, 20);

    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(20, 20, 19);
    doc.text(model.title, margin, 29);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(87, 86, 82);
    const moodLines = doc.splitTextToSize(model.moodSummary, contentW);
    doc.text(moodLines, margin, 36);

    let oy = 36 + moodLines.length * 5 + 4;

    if (model.flatLayImageUrl) {
      const flatLayImg = await loadImageForPdf(model.flatLayImageUrl);
      if (flatLayImg) {
        const imgW = 86;
        const imgH = Math.min(115, (flatLayImg.height / flatLayImg.width) * imgW);
        doc.addImage(flatLayImg.dataUrl, 'JPEG', margin, oy, imgW, imgH);

        const rightX = margin + imgW + 8;
        const rightW = contentW - imgW - 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(20, 20, 19);
        doc.text('Curated Pieces', rightX, oy + 5);

        let py = oy + 11;
        for (const piece of model.pieces) {
          const { r, g, b } = hexToRgb(piece.colorHex);
          doc.setFillColor(r, g, b);
          doc.rect(rightX, py - 3, 3.5, 3.5, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(20, 20, 19);
          doc.text(`${piece.slot}: ${piece.name}`, rightX + 6, py);
          py += 4.5;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(87, 86, 82);
          const detailLines = doc.splitTextToSize(
            `${piece.colorName} · ${piece.material} — ${piece.stylingTip}`,
            rightW - 6,
          );
          doc.text(detailLines, rightX + 6, py);
          py += detailLines.length * 4 + 4;
        }

        oy = Math.max(oy + imgH, py) + 8;
      }
    } else {
      let py = oy + 4;
      for (const piece of model.pieces) {
        const { r, g, b } = hexToRgb(piece.colorHex);
        doc.setFillColor(r, g, b);
        doc.rect(margin, py - 3, 3.5, 3.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(20, 20, 19);
        doc.text(`${piece.slot}: ${piece.name}`, margin + 6, py);
        py += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(87, 86, 82);
        const detailLines = doc.splitTextToSize(
          `${piece.colorName} · ${piece.material} — ${piece.stylingTip}`,
          contentW - 6,
        );
        doc.text(detailLines, margin + 6, py);
        py += detailLines.length * 4.5 + 5;
      }
      oy = py + 4;
    }

    doc.setFillColor(248, 248, 247);
    const harmonyLines = doc.splitTextToSize(
      `Color Harmony: ${model.colorHarmonyNote}`,
      contentW - 8,
    );
    const boxHeight = harmonyLines.length * 5 + 8;
    doc.rect(margin, oy, contentW, boxHeight, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(20, 20, 19);
    doc.text(harmonyLines, margin + 4, oy + 6);
  }

  const filename = buildPdfLookbookFilename(analysis.itemName);
  doc.save(filename);
  return { filename, pageCount: 1 + outfitModels.length };
}
