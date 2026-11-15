import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cleanFileLabel,
  getCategoriesForGender,
  getCategoryLabel,
  resolveOutfitPiecesWithCloset,
} from './wardrobe';
import type { WardrobeItem } from '../types/stylist';

test('getCategoriesForGender returns tailored male, female, and unisex taxonomies', () => {
  const male = getCategoriesForGender('male');
  assert.ok(male.some((c) => c.id === 'watches'));
  assert.ok(male.some((c) => c.id === 'eyewear'));
  assert.ok(male.some((c) => c.id === 'shoes'));
  assert.ok(male.some((c) => c.id === 'bags'));
  assert.equal(
    male.some((c) => c.id === 'dresses'),
    false,
  );

  const female = getCategoriesForGender('female');
  assert.ok(female.some((c) => c.id === 'dresses'));
  assert.ok(female.some((c) => c.id === 'bags'));
  assert.ok(female.some((c) => c.id === 'watches'));
  assert.ok(female.some((c) => c.id === 'eyewear'));

  const unisex = getCategoriesForGender('unisex');
  assert.ok(unisex.some((c) => c.id === 'dresses'));
  assert.equal(getCategoryLabel('eyewear', 'male'), 'Specs & Sunglasses');
});

test('cleanFileLabel formats uploaded garment filenames cleanly', () => {
  assert.equal(cleanFileLabel('my_navy-oxford_shirt.webp', 'Item'), 'My Navy Oxford Shirt');
  assert.equal(cleanFileLabel('   .png', 'Leather Watch'), 'Leather Watch');
});

test('resolveOutfitPiecesWithCloset hydrates piece category and photo from closet items', () => {
  const closet: WardrobeItem[] = [
    {
      id: 'item-1',
      label: 'Cream Knit Polo',
      category: 'tops',
      gender: 'male',
      colorName: 'Alabaster',
      colorHex: '#F3EFE6',
      imageUrl: 'data:image/jpeg;base64,highres1',
      syncThumbnailUrl: 'data:image/jpeg;base64,thumb1',
      createdAt: '2026-11-15T00:00:00Z',
    },
    {
      id: 'item-2',
      label: 'Chronograph Watch',
      category: 'watches',
      gender: 'male',
      colorName: 'Brushed Steel',
      colorHex: '#7A7D82',
      imageUrl: 'data:image/jpeg;base64,highres2',
      syncThumbnailUrl: 'data:image/jpeg;base64,thumb2',
      createdAt: '2026-11-15T00:01:00Z',
    },
  ];

  const resolved = resolveOutfitPiecesWithCloset(
    [
      {
        slot: 'Top',
        name: 'Cream Knit Polo',
        colorName: 'Alabaster',
        colorHex: '#F3EFE6',
        material: 'Cotton Knit',
        stylingTip: 'Wear untucked.',
        wardrobeItemId: 'item-1',
      },
      {
        slot: 'Watch',
        name: 'Chronograph Watch',
        colorName: 'Steel',
        colorHex: '#7A7D82',
        material: 'Steel',
        stylingTip: 'Pairs cleanly with knitwear.',
        wardrobeItemId: 'item-2',
      },
    ],
    closet,
  );

  assert.equal(resolved[0].imageUrl, 'data:image/jpeg;base64,highres1');
  assert.equal(resolved[0].category, 'tops');
  assert.equal(resolved[1].imageUrl, 'data:image/jpeg;base64,highres2');
  assert.equal(resolved[1].category, 'watches');
});
