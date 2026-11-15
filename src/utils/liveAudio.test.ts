import test from 'node:test';
import assert from 'node:assert/strict';
import {
  base64ToFloat32Pcm,
  buildStylistLiveContextSummary,
  float32ToInt16Pcm,
  getLiveWebSocketUrl,
  int16PcmToBase64,
  normalizeVoiceName,
} from './liveAudio';
import type { ItemAnalysis, OutfitOption } from '../types/stylist';

test('PCM16 encode/decode round-trips sine-like samples within 16-bit quantization tolerance', () => {
  const original = new Float32Array([-1, -0.5, 0, 0.25, 0.75, 1]);
  const int16 = float32ToInt16Pcm(original);
  const encoded = int16PcmToBase64(int16);
  const decoded = base64ToFloat32Pcm(encoded);

  assert.equal(decoded.length, original.length);
  for (let i = 0; i < original.length; i += 1) {
    assert.ok(
      Math.abs(decoded[i] - original[i]) < 0.001,
      `Sample ${i} drifted: ${decoded[i]} vs ${original[i]}`,
    );
  }
});

test('normalizeVoiceName falls back to Zephyr for unknown values', () => {
  assert.equal(normalizeVoiceName('Kore'), 'Kore');
  assert.equal(normalizeVoiceName('Fenrir'), 'Fenrir');
  assert.equal(normalizeVoiceName('UnknownVoice'), 'Zephyr');
});

test('getLiveWebSocketUrl uses wss for https and ws for http, or respects custom override', () => {
  assert.equal(
    getLiveWebSocketUrl({ protocol: 'https:', host: 'example.com' }),
    'wss://example.com/live',
  );
  assert.equal(
    getLiveWebSocketUrl({ protocol: 'http:', host: 'localhost:3000' }),
    'ws://localhost:3000/live',
  );
  assert.equal(
    getLiveWebSocketUrl(
      { protocol: 'https:', host: 'app.vercel.app' },
      'wss://ws.example.com/live',
    ),
    'wss://ws.example.com/live',
  );
});

test('buildStylistLiveContextSummary summarizes anchor garment and outfits', () => {
  const analysis: ItemAnalysis = {
    itemName: 'Botanical Jacquard Midi Skirt',
    category: 'A-Line Midi Skirt',
    silhouette: 'High-waisted A-line',
    fabricAndTexture: 'Cotton-silk jacquard',
    patternDescription: 'Cobalt and ochre floral motif',
    stylePersonality: 'Gallery Editorial',
    stylingStrategy: 'Balance bold weave with solids.',
    palette: [{ name: 'Cobalt Bloom', hex: '#1F4DA1', role: 'Primary' }],
  };
  const outfits: OutfitOption[] = [
    {
      id: '1',
      occasion: 'Casual',
      title: 'Sunday Walk',
      moodSummary: 'Easy daylight styling.',
      colorHarmonyNote: 'Warm leather echoes ochre.',
      pieces: [],
      flatLayPrompt: '',
      flatLayImageUrl: null,
      flatLayStatus: 'ready',
      editHistory: [],
    },
    {
      id: '2',
      occasion: 'Business',
      title: 'Gallery Briefing',
      moodSummary: 'Tailored charcoal.',
      colorHarmonyNote: 'Ivory brightens.',
      pieces: [],
      flatLayPrompt: '',
      flatLayImageUrl: null,
      flatLayStatus: 'ready',
      editHistory: [],
    },
    {
      id: '3',
      occasion: 'Night Out',
      title: 'Vernissage',
      moodSummary: 'Evening silk.',
      colorHarmonyNote: 'Bronze metallic.',
      pieces: [],
      flatLayPrompt: '',
      flatLayImageUrl: null,
      flatLayStatus: 'ready',
      editHistory: [],
    },
  ];
  const summary = buildStylistLiveContextSummary(analysis, outfits);
  assert.match(summary, /Botanical Jacquard Midi Skirt/);
  assert.match(summary, /Casual/);
  assert.match(summary, /Business/);
  assert.match(summary, /Night Out/);
});
