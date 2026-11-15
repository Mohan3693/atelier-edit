export type OccasionType = 'Casual' | 'Business' | 'Night Out';

export type ColorPaletteCategory =
  | 'Monochromatic'
  | 'Complementary'
  | 'Neutral Tones'
  | 'Analogous';

export type PaletteFilterOption = 'All' | ColorPaletteCategory;

export type PaletteRole = 'Primary' | 'Secondary' | 'Accent' | 'Neutral';

export interface PaletteSwatch {
  name: string;
  hex: string;
  role: PaletteRole;
}

export interface ItemAnalysis {
  itemName: string;
  category: string;
  silhouette: string;
  fabricAndTexture: string;
  patternDescription: string;
  stylePersonality: string;
  stylingStrategy: string;
  palette: PaletteSwatch[];
}

export interface OutfitPiece {
  slot: string;
  name: string;
  colorName: string;
  colorHex: string;
  material: string;
  stylingTip: string;
}

export interface OutfitOption {
  id: string;
  occasion: OccasionType;
  title: string;
  moodSummary: string;
  colorHarmonyNote: string;
  colorPaletteCategory?: ColorPaletteCategory;
  pieces: OutfitPiece[];
  flatLayPrompt: string;
  flatLayImageUrl: string | null;
  flatLayStatus: 'idle' | 'loading' | 'ready' | 'error';
  flatLayError?: string;
  requiresPaidKey?: boolean;
  editHistory: string[];
}

export interface SavedLook {
  id: string;
  savedAt: string;
  anchorItemName: string;
  anchorImageUrl: string;
  palette: PaletteSwatch[];
  outfit: OutfitOption;
}

export interface SampleGarment {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  imageUrl: string;
  challengeNote: string;
  precomputedAnalysis?: ItemAnalysis;
  precomputedOutfits?: OutfitOption[];
}
