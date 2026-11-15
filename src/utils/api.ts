import type {
  ItemAnalysis,
  OccasionType,
  OutfitOption,
  SavedLook,
  WardrobeCategoryId,
  WardrobeGender,
} from '../types/stylist';
import { parseDataUrl } from './stylist';

export interface AnalyzeResponse {
  itemAnalysis: ItemAnalysis;
  outfits: Array<
    Omit<OutfitOption, 'id' | 'flatLayImageUrl' | 'flatLayStatus' | 'editHistory'>
  >;
}

export async function fileToResizedDataUrl(
  file: File,
  maxDimension = 1024,
): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read uploaded file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  return resizeDataUrlIfNeeded(rawDataUrl, maxDimension);
}

export async function urlToDataUrl(
  url: string,
  maxDimension = 1024,
): Promise<string> {
  if (parseDataUrl(url)) {
    return resizeDataUrlIfNeeded(url, maxDimension);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load image asset (${response.status}).`);
  }
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error('Could not load image asset as a valid image.');
  }
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not encode image data.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to encode image.'));
    reader.readAsDataURL(blob);
  });
  return resizeDataUrlIfNeeded(rawDataUrl, maxDimension);
}

async function resizeDataUrlIfNeeded(
  dataUrl: string,
  maxDimension: number,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth, naturalHeight } = img;
      const needsResize = naturalWidth > maxDimension || naturalHeight > maxDimension;
      const needsCompression = dataUrl.length > 500_000;
      if (!needsResize && !needsCompression) {
        resolve(dataUrl);
        return;
      }
      const scale = needsResize
        ? Math.min(maxDimension / naturalWidth, maxDimension / naturalHeight)
        : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export class ApiRequestError extends Error {
  status: number;
  requiresPaidKey: boolean;

  constructor(message: string, status: number, requiresPaidKey = false) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.requiresPaidKey = requiresPaidKey;
  }
}

async function readErrorPayload(response: Response, fallback: string) {
  if (response.status === 504) {
    return {
      error:
        'The styling model took too long to respond (HTTP 504). Please try again with fewer or smaller photos.',
      requiresPaidKey: false,
    };
  }
  const text = await response.text().catch(() => '');
  try {
    const parsed = JSON.parse(text) as { error?: string; requiresPaidKey?: boolean };
    return {
      error: parsed.error || `${fallback} (HTTP ${response.status})`,
      requiresPaidKey: Boolean(parsed.requiresPaidKey),
    };
  } catch {
    return {
      error: `${fallback} (HTTP ${response.status})`,
      requiresPaidKey: false,
    };
  }
}

export async function composeClosetOutfitsApi(params: {
  gender: WardrobeGender;
  season: string;
  aesthetic: string;
  anchorItemId?: string;
  items: Array<{
    id: string;
    category: WardrobeCategoryId;
    label: string;
    imageDataUrl: string;
  }>;
}): Promise<AnalyzeResponse> {
  const response = await fetch('/api/style/compose-closet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errPayload = await readErrorPayload(response, 'Failed to style closet outfits.');
    throw new ApiRequestError(
      errPayload.error,
      response.status,
      errPayload.requiresPaidKey,
    );
  }
  return (await response.json()) as AnalyzeResponse;
}

export async function analyzeGarmentApi(params: {
  imageDataUrl: string;
  season: string;
  aesthetic: string;
}): Promise<AnalyzeResponse> {
  const response = await fetch('/api/style/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errPayload = await readErrorPayload(response, 'Failed to analyze garment.');
    throw new ApiRequestError(
      errPayload.error,
      response.status,
      errPayload.requiresPaidKey,
    );
  }
  return (await response.json()) as AnalyzeResponse;
}

export async function generateFlatLayApi(params: {
  imageDataUrl?: string;
  flatLayPrompt: string;
  occasion: OccasionType;
  aspectRatio?: '3:4' | '4:3' | '1:1';
  imageSize?: '1K' | '2K';
}): Promise<{ imageUrl: string; modelNote?: string }> {
  const response = await fetch('/api/style/flatlay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errPayload = await readErrorPayload(
      response,
      'Failed to generate flat-lay visualization.',
    );
    throw new ApiRequestError(
      errPayload.error,
      response.status,
      errPayload.requiresPaidKey,
    );
  }
  return (await response.json()) as { imageUrl: string; modelNote?: string };
}

export async function createOrEditImageApi(params: {
  prompt: string;
  sourceImageDataUrl?: string;
  aspectRatio?: '3:4' | '4:3' | '1:1';
  imageSize?: '1K' | '2K';
}): Promise<{ imageUrl: string; modelNote?: string }> {
  const response = await fetch('/api/style/create-or-edit-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errPayload = await readErrorPayload(
      response,
      'Failed to generate or edit image.',
    );
    throw new ApiRequestError(
      errPayload.error,
      response.status,
      errPayload.requiresPaidKey,
    );
  }
  return (await response.json()) as { imageUrl: string; modelNote?: string };
}

export interface SqlWardrobeHistoryResponse {
  analyses: Array<{
    id: number;
    itemName: string;
    category: string;
    season: string;
    aesthetic: string;
    stylePersonality: string;
    stylingStrategy: string;
    analysisJson: {
      itemAnalysis?: ItemAnalysis;
      outfits?: OutfitOption[];
    };
    createdAt: string;
  }>;
  savedLooks: Array<{
    id: number;
    clientLookId: string;
    anchorItemName: string;
    occasion: string;
    title: string;
    colorPaletteCategory: string | null;
    moodSummary: string;
    colorHarmonyNote: string;
    anchorImageRef: string | null;
    outfitJson: OutfitOption;
    paletteJson: ItemAnalysis['palette'];
    createdAt: string;
  }>;
  voiceSessions: Array<{
    id: number;
    anchorItemName: string;
    voiceName: string;
    transcriptSummary: string | null;
    durationSeconds: number;
    createdAt: string;
  }>;
}

export async function syncUserSqlApi(idToken: string): Promise<void> {
  const response = await fetch('/api/wardrobe/sync-user', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Unable to synchronize user profile.');
  }
}

export async function fetchWardrobeHistorySqlApi(
  idToken: string,
): Promise<SqlWardrobeHistoryResponse> {
  const response = await fetch('/api/wardrobe/history', {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  if (!response.ok) {
    throw new Error('Unable to load wardrobe history.');
  }
  return (await response.json()) as SqlWardrobeHistoryResponse;
}

export async function recordAnalysisSqlApi(
  idToken: string,
  payload: {
    analysis: ItemAnalysis;
    outfits: OutfitOption[];
    season: string;
    aesthetic: string;
  },
): Promise<void> {
  const response = await fetch('/api/wardrobe/analyses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Unable to persist wardrobe analysis.');
  }
}

export async function upsertSavedLookSqlApi(
  idToken: string,
  look: SavedLook,
): Promise<void> {
  const response = await fetch('/api/wardrobe/saved', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ look }),
  });
  if (!response.ok) {
    throw new Error('Unable to save outfit to account.');
  }
}

export async function deleteSavedLookSqlApi(
  idToken: string,
  clientLookId: string,
): Promise<void> {
  const response = await fetch(
    `/api/wardrobe/saved/${encodeURIComponent(clientLookId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    },
  );
  if (!response.ok) {
    throw new Error('Unable to delete saved outfit.');
  }
}

export async function recordVoiceSessionSqlApi(
  idToken: string,
  payload: {
    anchorItemName: string;
    voiceName: string;
    transcriptSummary: string;
    durationSeconds: number;
  },
): Promise<void> {
  const response = await fetch('/api/wardrobe/voice-sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Unable to save voice session log.');
  }
}

export async function deleteUserAccountSqlApi(idToken: string): Promise<void> {
  const response = await fetch('/api/wardrobe/account', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  if (!response.ok) {
    throw new Error('Unable to remove account records.');
  }
}
