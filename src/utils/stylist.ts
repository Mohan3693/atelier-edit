import type {
  ColorPaletteCategory,
  ItemAnalysis,
  OutfitOption,
  OutfitPiece,
  PaletteFilterOption,
  PaletteSwatch,
  SavedLook,
} from '../types/stylist';

export const PALETTE_FILTER_OPTIONS: PaletteFilterOption[] = [
  'All',
  'Monochromatic',
  'Complementary',
  'Neutral Tones',
  'Analogous',
];

export interface ParsedImageDataUrl {
  mimeType: string;
  base64Data: string;
}

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export function parseDataUrl(dataUrl: string): ParsedImageDataUrl | null {
  if (typeof dataUrl !== 'string') return null;
  const trimmed = dataUrl.trim();
  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(trimmed);
  if (!match) return null;

  const rawMime = match[1].toLowerCase();
  const mimeType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(rawMime)) {
    return null;
  }

  return {
    mimeType,
    base64Data: match[2],
  };
}

export function normalizeHexColor(input: string, fallback = '#2B2B29'): string {
  if (typeof input !== 'string') return fallback;
  const cleaned = input.trim().replace(/^#/, '');
  if (/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }
  if (/^[0-9A-Fa-f]{3}$/.test(cleaned)) {
    const expanded = cleaned
      .split('')
      .map((ch) => ch + ch)
      .join('');
    return `#${expanded.toUpperCase()}`;
  }
  return fallback;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const normalized = normalizeHexColor(hex, '#2B2B29').slice(1);
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  h /= 6;

  return {
    h: Math.round(h * 360) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function isNeutralColor(hex: string): boolean {
  const { s, l } = hexToHsl(hex);
  return s < 18 || l <= 12 || l >= 92;
}

export function normalizePaletteCategory(raw?: string): ColorPaletteCategory | null {
  if (!raw || typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  if (lower.includes('mono')) return 'Monochromatic';
  if (lower.includes('comp')) return 'Complementary';
  if (lower.includes('neutral')) return 'Neutral Tones';
  if (lower.includes('analog')) return 'Analogous';
  return null;
}

function circularHueDistance(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function classifyOutfitPaletteCategory(
  pieces: OutfitPiece[],
  anchorPalette: PaletteSwatch[],
): ColorPaletteCategory {
  if (pieces.length === 0) return 'Neutral Tones';

  const chromaticPieces = pieces.filter((p) => !isNeutralColor(p.colorHex));
  if (chromaticPieces.length === 0) {
    return 'Neutral Tones';
  }

  const chromaticAnchors = anchorPalette.filter((s) => !isNeutralColor(s.hex));
  if (chromaticAnchors.length === 0) {
    return chromaticPieces.length <= 1 ? 'Neutral Tones' : 'Monochromatic';
  }

  const anchorHues = chromaticAnchors.map((s) => hexToHsl(s.hex).h);
  const distances = chromaticPieces.map((piece) => {
    const pieceHue = hexToHsl(piece.colorHex).h;
    return Math.min(...anchorHues.map((ah) => circularHueDistance(pieceHue, ah)));
  });

  const maxDist = Math.max(...distances);
  const avgDist = distances.reduce((acc, d) => acc + d, 0) / distances.length;

  if (maxDist >= 115) return 'Complementary';
  if (avgDist <= 30) return 'Monochromatic';
  return 'Analogous';
}

export function getOutfitPaletteCategory(
  outfit: Pick<OutfitOption, 'colorPaletteCategory' | 'pieces'>,
  anchorPalette: PaletteSwatch[],
): ColorPaletteCategory {
  const explicit = normalizePaletteCategory(outfit.colorPaletteCategory);
  if (explicit) return explicit;
  return classifyOutfitPaletteCategory(outfit.pieces, anchorPalette);
}

export function filterOutfitsByPalette(
  outfits: OutfitOption[],
  filter: PaletteFilterOption,
  anchorPalette: PaletteSwatch[],
): OutfitOption[] {
  if (filter === 'All') return outfits;
  return outfits.filter(
    (outfit) => getOutfitPaletteCategory(outfit, anchorPalette) === filter,
  );
}

export function countOutfitsByPalette(
  outfits: OutfitOption[],
  anchorPalette: PaletteSwatch[],
): Record<PaletteFilterOption, number> {
  const counts: Record<PaletteFilterOption, number> = {
    All: outfits.length,
    Monochromatic: 0,
    Complementary: 0,
    'Neutral Tones': 0,
    Analogous: 0,
  };

  for (const outfit of outfits) {
    const category = getOutfitPaletteCategory(outfit, anchorPalette);
    counts[category] += 1;
  }
  return counts;
}

export function getContrastTextColor(hex: string): '#141413' | '#FFFFFF' {
  const normalized = normalizeHexColor(hex, '#2B2B29').slice(1);
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return luminance > 0.36 ? '#141413' : '#FFFFFF';
}

export function validateEditPrompt(prompt: string): {
  valid: boolean;
  cleaned: string;
  error?: string;
} {
  const cleaned = typeof prompt === 'string' ? prompt.trim() : '';
  if (cleaned.length < 3) {
    return {
      valid: false,
      cleaned,
      error: 'Enter at least 3 characters describing the edit or image to create.',
    };
  }
  if (cleaned.length > 500) {
    return {
      valid: false,
      cleaned: cleaned.slice(0, 500),
      error: 'Prompt must be 500 characters or fewer.',
    };
  }
  return { valid: true, cleaned };
}

export function buildFlatLayPrompt(
  analysis: ItemAnalysis,
  outfit: Pick<OutfitOption, 'occasion' | 'title' | 'pieces' | 'flatLayPrompt'>,
  customInstruction?: string,
): string {
  const pieceDescriptions = outfit.pieces
    .map((piece) => `${piece.colorName} ${piece.name} (${piece.material})`)
    .join(', ');

  const paletteSummary = analysis.palette
    .slice(0, 4)
    .map((s) => `${s.name} (${normalizeHexColor(s.hex)})`)
    .join(', ');

  const base =
    outfit.flatLayPrompt && outfit.flatLayPrompt.trim().length > 20
      ? outfit.flatLayPrompt.trim()
      : `Overhead fashion editorial flat-lay photography of a complete ${outfit.occasion} outfit featuring the exact uploaded ${analysis.itemName} neatly arranged with ${pieceDescriptions}.`;

  const constraints = [
    `Anchor garment: preserve the exact pattern, fabric, silhouette, and colors (${paletteSummary}) of the provided ${analysis.itemName}.`,
    `Curated companion pieces: ${pieceDescriptions}.`,
    'Layout: clean overhead knolling flat-lay composition on a seamless crisp alabaster studio paper background (#F8F8F7), evenly spaced garments and accessories with soft diffused daylight, realistic fabric drape, zero mannequins, zero human models, zero text overlays.',
  ];

  if (customInstruction && customInstruction.trim().length > 0) {
    constraints.push(`Styling adjustment: ${customInstruction.trim()}.`);
  }

  return `${base} ${constraints.join(' ')}`;
}

export function isOutfitSaved(savedLooks: SavedLook[], outfitId: string): boolean {
  return savedLooks.some((look) => look.id === outfitId);
}

export function toggleSavedOutfit(
  savedLooks: SavedLook[],
  candidate: {
    outfit: OutfitOption;
    anchorItemName: string;
    anchorImageUrl: string;
    palette: PaletteSwatch[];
    savedAt?: string;
  },
): { next: SavedLook[]; saved: boolean } {
  const exists = isOutfitSaved(savedLooks, candidate.outfit.id);
  if (exists) {
    return {
      next: savedLooks.filter((look) => look.id !== candidate.outfit.id),
      saved: false,
    };
  }

  const entry: SavedLook = {
    id: candidate.outfit.id,
    savedAt: candidate.savedAt ?? new Date().toISOString(),
    anchorItemName: candidate.anchorItemName,
    anchorImageUrl: candidate.anchorImageUrl,
    palette: candidate.palette,
    outfit: candidate.outfit,
  };

  return {
    next: [entry, ...savedLooks],
    saved: true,
  };
}

export const SAVED_LOOKS_STORAGE_KEY = 'atelier_edit_saved_looks_v1';

export function parseSavedLooksJson(raw: string | null): SavedLook[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedLook =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.anchorItemName === 'string' &&
        Boolean(item.outfit) &&
        typeof item.outfit.title === 'string',
    );
  } catch {
    return [];
  }
}
