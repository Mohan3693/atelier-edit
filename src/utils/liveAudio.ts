import type { ItemAnalysis, OutfitOption } from '../types/stylist';

export type StylistVoiceName = 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';

export const AVAILABLE_STYLIST_VOICES: Array<{
  id: StylistVoiceName;
  label: string;
  tone: string;
}> = [
  { id: 'Zephyr', label: 'Zephyr', tone: 'Warm & Editorial' },
  { id: 'Kore', label: 'Kore', tone: 'Crisp & Assured' },
  { id: 'Puck', label: 'Puck', tone: 'Bright & Conversational' },
  { id: 'Charon', label: 'Charon', tone: 'Calm & Measured' },
  { id: 'Fenrir', label: 'Fenrir', tone: 'Direct & Tailored' },
];

export function normalizeVoiceName(voice: unknown): StylistVoiceName {
  if (
    voice === 'Zephyr' ||
    voice === 'Kore' ||
    voice === 'Puck' ||
    voice === 'Charon' ||
    voice === 'Fenrir'
  ) {
    return voice;
  }
  return 'Zephyr';
}

export function float32ToInt16Pcm(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, input[i]));
    output[i] = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
  }
  return output;
}

export function int16PcmToBase64(pcm16: Int16Array): string {
  const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function base64ToFloat32Pcm(base64: string): Float32Array {
  const binary = atob(base64);
  const byteLength = binary.length;
  const sampleCount = Math.floor(byteLength / 2);
  const float32 = new Float32Array(sampleCount);
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < sampleCount; i += 1) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

export function buildStylistLiveContextSummary(
  analysis: ItemAnalysis | null,
  outfits: OutfitOption[],
): string {
  if (!analysis) {
    return 'No specific garment has been analyzed yet. Help the client pick colors, silhouettes, and flat-lay outfit ideas.';
  }

  const paletteText = analysis.palette
    .map((p) => `${p.name} (${p.hex}, ${p.role})`)
    .join(', ');

  const looksText = outfits
    .map(
      (look) =>
        `${look.occasion} ("${look.title}", ${look.colorPaletteCategory ?? 'Balanced'}): ${look.pieces.map((p) => `${p.slot}: ${p.name} in ${p.colorName}`).join('; ')}`,
    )
    .join(' | ');

  return [
    `Anchor Garment: ${analysis.itemName} (${analysis.category}).`,
    `Silhouette: ${analysis.silhouette}.`,
    `Fabric: ${analysis.fabricAndTexture}.`,
    `Palette: ${paletteText}.`,
    `Styling Strategy: ${analysis.stylingStrategy}.`,
    looksText ? `Current 3 Outfits: ${looksText}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function getLiveWebSocketUrl(loc: { protocol: string; host: string }): string {
  const wsProtocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${loc.host}/live`;
}
