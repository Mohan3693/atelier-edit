import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFlatLayPrompt,
  classifyOutfitPaletteCategory,
  countOutfitsByPalette,
  filterOutfitsByPalette,
  getContrastTextColor,
  hexToHsl,
  isOutfitSaved,
  normalizeHexColor,
  parseDataUrl,
  parseSavedLooksJson,
  toggleSavedOutfit,
  validateEditPrompt,
} from './stylist';
import type { ItemAnalysis, OutfitOption, PaletteSwatch, SavedLook } from '../types/stylist';

test('parseDataUrl extracts mimeType and base64 payload for supported image types', () => {
  const valid = parseDataUrl('data:image/png;base64,iVBORw0KGgo=');
  assert.deepEqual(valid, { mimeType: 'image/png', base64Data: 'iVBORw0KGgo=' });

  const jpgNormalized = parseDataUrl('data:image/jpg;base64,/9j/4AAQ');
  assert.deepEqual(jpgNormalized, { mimeType: 'image/jpeg', base64Data: '/9j/4AAQ' });

  assert.equal(parseDataUrl('data:text/plain;base64,SGVsbG8='), null);
  assert.equal(parseDataUrl('not-a-data-url'), null);
});

test('normalizeHexColor normalizes 3-char and 6-char hex strings and rejects invalid input', () => {
  assert.equal(normalizeHexColor('1f4e8c'), '#1F4E8C');
  assert.equal(normalizeHexColor('#abc'), '#AABBCC');
  assert.equal(normalizeHexColor('invalid', '#141413'), '#141413');
});

test('getContrastTextColor returns dark ink on light swatches and white on dark swatches', () => {
  assert.equal(getContrastTextColor('#F8F8F7'), '#141413');
  assert.equal(getContrastTextColor('#E9C46A'), '#141413');
  assert.equal(getContrastTextColor('#1B3B6F'), '#FFFFFF');
  assert.equal(getContrastTextColor('#141413'), '#FFFFFF');
});

test('validateEditPrompt enforces minimum and maximum length without silent fallbacks', () => {
  assert.equal(validateEditPrompt('   ').valid, false);
  assert.equal(validateEditPrompt('hi').valid, false);
  const ok = validateEditPrompt('  Swap loafers for white sneakers  ');
  assert.equal(ok.valid, true);
  assert.equal(ok.cleaned, 'Swap loafers for white sneakers');
  assert.equal(validateEditPrompt('a'.repeat(501)).valid, false);
});

test('buildFlatLayPrompt includes anchor item, palette, pieces, and custom edits', () => {
  const analysis: ItemAnalysis = {
    itemName: 'Botanical Jacquard Midi Skirt',
    category: 'Midi Skirt',
    silhouette: 'A-line',
    fabricAndTexture: 'Woven cotton-silk jacquard',
    patternDescription: 'Cobalt and ochre floral motif',
    stylePersonality: 'Artisanal Editorial',
    stylingStrategy: 'Ground the bold weave with crisp tonal neutrals.',
    palette: [
      { name: 'Cobalt Blue', hex: '#1E4C9A', role: 'Primary' },
      { name: 'Warm Ochre', hex: '#B97A2E', role: 'Accent' },
    ],
  };

  const outfit: Pick<OutfitOption, 'occasion' | 'title' | 'pieces' | 'flatLayPrompt'> = {
    occasion: 'Casual',
    title: 'Weekend Gallery',
    flatLayPrompt: '',
    pieces: [
      {
        slot: 'Top',
        name: 'Heavyweight Ribbed Tee',
        colorName: 'Optic White',
        colorHex: '#F7F7F5',
        material: 'Organic cotton',
        stylingTip: 'Tuck loosely into the high waistband.',
      },
    ],
  };

  const prompt = buildFlatLayPrompt(analysis, outfit, 'Use tortoiseshell sunglasses');
  assert.match(prompt, /Botanical Jacquard Midi Skirt/);
  assert.match(prompt, /Optic White Heavyweight Ribbed Tee/);
  assert.match(prompt, /#1E4C9A/);
  assert.match(prompt, /Use tortoiseshell sunglasses/);
});

test('toggleSavedOutfit adds and removes outfits cleanly and parseSavedLooksJson guards corrupt data', () => {
  const sampleOutfit: OutfitOption = {
    id: 'look-business-1',
    occasion: 'Business',
    title: 'Studio Briefing',
    moodSummary: 'Sharp tailoring balances rich texture.',
    colorHarmonyNote: 'Ivory and charcoal anchor the cobalt weave.',
    pieces: [],
    flatLayPrompt: 'Overhead studio flat-lay.',
    flatLayImageUrl: '/sample.jpg',
    flatLayStatus: 'ready',
    editHistory: [],
  };

  const initial: SavedLook[] = [];
  const added = toggleSavedOutfit(initial, {
    outfit: sampleOutfit,
    anchorItemName: 'Jacquard Skirt',
    anchorImageUrl: '/skirt.jpg',
    palette: [],
    savedAt: '2026-11-14T08:50:00Z',
  });

  assert.equal(added.saved, true);
  assert.equal(added.next.length, 1);
  assert.equal(isOutfitSaved(added.next, 'look-business-1'), true);

  const parsed = parseSavedLooksJson(JSON.stringify(added.next));
  assert.equal(parsed.length, 1);
  assert.deepEqual(parseSavedLooksJson('corrupt{json'), []);

  const removed = toggleSavedOutfit(added.next, {
    outfit: sampleOutfit,
    anchorItemName: 'Jacquard Skirt',
    anchorImageUrl: '/skirt.jpg',
    palette: [],
  });
  assert.equal(removed.saved, false);
  assert.equal(removed.next.length, 0);
});

test('hexToHsl and classifyOutfitPaletteCategory classify Neutral, Monochromatic, and Complementary palettes', () => {
  assert.equal(hexToHsl('#1F4DA1').h > 200, true);
  assert.equal(hexToHsl('#F2EDE2').s < 40, true);

  const blueAnchor: PaletteSwatch[] = [
    { name: 'Cobalt', hex: '#1F4DA1', role: 'Primary' },
  ];

  const neutralResult = classifyOutfitPaletteCategory(
    [
      { slot: 'Top', name: 'Ivory Knit', colorName: 'Ivory', colorHex: '#F2EDE2', material: 'Wool', stylingTip: '' },
      { slot: 'Outerwear', name: 'Charcoal Blazer', colorName: 'Charcoal', colorHex: '#353638', material: 'Wool', stylingTip: '' },
    ],
    blueAnchor,
  );
  assert.equal(neutralResult, 'Neutral Tones');

  const monoResult = classifyOutfitPaletteCategory(
    [
      { slot: 'Top', name: 'Sky Shirt', colorName: 'Sky', colorHex: '#5A82B0', material: 'Cotton', stylingTip: '' },
      { slot: 'Bag', name: 'Navy Tote', colorName: 'Navy', colorHex: '#203E78', material: 'Leather', stylingTip: '' },
    ],
    blueAnchor,
  );
  assert.equal(monoResult, 'Monochromatic');

  const compResult = classifyOutfitPaletteCategory(
    [
      { slot: 'Bag', name: 'Rust Saddle Bag', colorName: 'Rust', colorHex: '#B8542A', material: 'Leather', stylingTip: '' },
    ],
    blueAnchor,
  );
  assert.equal(compResult, 'Complementary');
});

test('filterOutfitsByPalette and countOutfitsByPalette filter and tally looks accurately', () => {
  const anchorPalette: PaletteSwatch[] = [
    { name: 'Cobalt', hex: '#1F4DA1', role: 'Primary' },
  ];
  const makeOutfit = (
    id: string,
    occasion: OutfitOption['occasion'],
    colorPaletteCategory: OutfitOption['colorPaletteCategory'],
  ): OutfitOption => ({
    id,
    occasion,
    title: id,
    moodSummary: '',
    colorHarmonyNote: '',
    colorPaletteCategory,
    pieces: [],
    flatLayPrompt: '',
    flatLayImageUrl: null,
    flatLayStatus: 'ready',
    editHistory: [],
  });

  const outfits = [
    makeOutfit('1', 'Casual', 'Complementary'),
    makeOutfit('2', 'Business', 'Neutral Tones'),
    makeOutfit('3', 'Night Out', 'Monochromatic'),
  ];

  const counts = countOutfitsByPalette(outfits, anchorPalette);
  assert.equal(counts.All, 3);
  assert.equal(counts.Complementary, 1);
  assert.equal(counts['Neutral Tones'], 1);
  assert.equal(counts.Monochromatic, 1);
  assert.equal(counts.Analogous, 0);

  assert.equal(filterOutfitsByPalette(outfits, 'All', anchorPalette).length, 3);
  assert.deepEqual(
    filterOutfitsByPalette(outfits, 'Neutral Tones', anchorPalette).map((o) => o.id),
    ['2'],
  );
  assert.equal(filterOutfitsByPalette(outfits, 'Analogous', anchorPalette).length, 0);
});

import { buildPdfLookbookFilename, buildPdfOutfitModels, hexToRgb } from './pdfExport';

test('buildPdfLookbookFilename sanitizes garment names and hexToRgb converts hex strings', () => {
  assert.equal(
    buildPdfLookbookFilename('Botanical Jacquard Midi Skirt!'),
    'atelier-edit-botanical-jacquard-midi-skirt.pdf',
  );
  assert.equal(buildPdfLookbookFilename('   '), 'atelier-edit-lookbook.pdf');
  assert.deepEqual(hexToRgb('#1F4DA1'), { r: 31, g: 77, b: 161 });
});

test('buildPdfOutfitModels formats outfit kickers and normalized hex colors', () => {
  const analysis: ItemAnalysis = {
    itemName: 'Jacquard Skirt',
    category: 'Skirt',
    silhouette: 'A-line',
    fabricAndTexture: 'Jacquard',
    patternDescription: 'Floral',
    stylePersonality: 'Editorial',
    stylingStrategy: 'Balance with solids.',
    palette: [{ name: 'Cobalt', hex: '#1F4DA1', role: 'Primary' }],
  };
  const outfits: OutfitOption[] = [
    {
      id: '1',
      occasion: 'Casual',
      title: 'Gallery Walk',
      moodSummary: 'Easy daylight look.',
      colorHarmonyNote: 'Balanced neutrals.',
      colorPaletteCategory: 'Neutral Tones',
      pieces: [
        {
          slot: 'Top',
          name: 'White Tee',
          colorName: 'White',
          colorHex: 'fff',
          material: 'Cotton',
          stylingTip: 'Tuck in.',
        },
      ],
      flatLayPrompt: '',
      flatLayImageUrl: '/img.jpg',
      flatLayStatus: 'ready',
      editHistory: [],
    },
  ];

  const models = buildPdfOutfitModels(outfits, analysis);
  assert.equal(models.length, 1);
  assert.equal(models[0].kicker, 'Casual · Look 01 · Neutral Tones');
  assert.equal(models[0].pieces[0].colorHex, '#FFFFFF');
});
