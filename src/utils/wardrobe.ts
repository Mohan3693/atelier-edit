import type {
  WardrobeCategoryId,
  WardrobeCategoryMeta,
  WardrobeGender,
  WardrobeItem,
} from '../types/stylist';

const MALE_CATEGORIES: WardrobeCategoryMeta[] = [
  {
    id: 'tops',
    label: 'Shirts & Tops',
    shortLabel: 'Shirts',
    placeholder: 'T-shirts, polos, button-downs, knitwear',
  },
  {
    id: 'outerwear',
    label: 'Jackets & Blazers',
    shortLabel: 'Jackets',
    placeholder: 'Blazers, overshirts, coats, denim jackets',
  },
  {
    id: 'bottoms',
    label: 'Trousers & Shorts',
    shortLabel: 'Trousers',
    placeholder: 'Chinos, jeans, tailored trousers, shorts',
  },
  {
    id: 'shoes',
    label: 'Shoes & Sneakers',
    shortLabel: 'Shoes',
    placeholder: 'Sneakers, loafers, boots, dress shoes',
  },
  {
    id: 'watches',
    label: 'Watches',
    shortLabel: 'Watches',
    placeholder: 'Dress watches, chronographs, smartwatches',
  },
  {
    id: 'eyewear',
    label: 'Specs & Sunglasses',
    shortLabel: 'Specs',
    placeholder: 'Optical specs, aviators, acetate sunglasses',
  },
  {
    id: 'bags',
    label: 'Bags & Backpacks',
    shortLabel: 'Bags',
    placeholder: 'Messenger bags, totes, backpacks, duffels',
  },
  {
    id: 'accessories',
    label: 'Belts & Accessories',
    shortLabel: 'Accessories',
    placeholder: 'Leather belts, caps, chains, rings',
  },
];

const FEMALE_CATEGORIES: WardrobeCategoryMeta[] = [
  {
    id: 'tops',
    label: 'Tops & Blouses',
    shortLabel: 'Tops',
    placeholder: 'Silk blouses, tees, knits, tailored shirts',
  },
  {
    id: 'dresses',
    label: 'Dresses & Jumpsuits',
    shortLabel: 'Dresses',
    placeholder: 'Slip dresses, midi dresses, jumpsuits',
  },
  {
    id: 'outerwear',
    label: 'Coats & Blazers',
    shortLabel: 'Outerwear',
    placeholder: 'Blazers, trench coats, cardigans, jackets',
  },
  {
    id: 'bottoms',
    label: 'Skirts & Trousers',
    shortLabel: 'Bottoms',
    placeholder: 'Midi skirts, wide-leg trousers, denim jeans',
  },
  {
    id: 'shoes',
    label: 'Shoes & Heels',
    shortLabel: 'Shoes',
    placeholder: 'Heels, flats, loafers, boots, sneakers',
  },
  {
    id: 'bags',
    label: 'Bags & Clutches',
    shortLabel: 'Bags',
    placeholder: 'Shoulder bags, totes, evening clutches',
  },
  {
    id: 'watches',
    label: 'Watches',
    shortLabel: 'Watches',
    placeholder: 'Bracelet watches, leather-strap timepieces',
  },
  {
    id: 'eyewear',
    label: 'Specs & Sunglasses',
    shortLabel: 'Specs',
    placeholder: 'Optical specs, cat-eye, metal sunglasses',
  },
  {
    id: 'accessories',
    label: 'Jewellery & Belts',
    shortLabel: 'Jewellery',
    placeholder: 'Earrings, necklaces, belts, scarves',
  },
];

const UNISEX_CATEGORIES: WardrobeCategoryMeta[] = [
  {
    id: 'tops',
    label: 'Tops & Shirts',
    shortLabel: 'Tops',
    placeholder: 'Tees, shirts, polos, knitwear',
  },
  {
    id: 'dresses',
    label: 'Dresses & One-Pieces',
    shortLabel: 'Dresses',
    placeholder: 'Dresses, jumpsuits, co-ords',
  },
  {
    id: 'outerwear',
    label: 'Jackets & Coats',
    shortLabel: 'Outerwear',
    placeholder: 'Blazers, trenches, coats, overshirts',
  },
  {
    id: 'bottoms',
    label: 'Trousers & Skirts',
    shortLabel: 'Bottoms',
    placeholder: 'Trousers, jeans, chinos, skirts',
  },
  {
    id: 'shoes',
    label: 'Shoes & Footwear',
    shortLabel: 'Shoes',
    placeholder: 'Sneakers, loafers, boots, heels',
  },
  {
    id: 'bags',
    label: 'Bags & Totes',
    shortLabel: 'Bags',
    placeholder: 'Totes, crossbody, backpacks, clutches',
  },
  {
    id: 'watches',
    label: 'Watches',
    shortLabel: 'Watches',
    placeholder: 'Metal, leather, or minimal watches',
  },
  {
    id: 'eyewear',
    label: 'Specs & Sunglasses',
    shortLabel: 'Specs',
    placeholder: 'Optical frames and sunglasses',
  },
  {
    id: 'accessories',
    label: 'Belts & Jewellery',
    shortLabel: 'Accessories',
    placeholder: 'Belts, scarves, hats, jewellery',
  },
];

export function getCategoriesForGender(gender: WardrobeGender): WardrobeCategoryMeta[] {
  if (gender === 'male') return MALE_CATEGORIES;
  if (gender === 'female') return FEMALE_CATEGORIES;
  return UNISEX_CATEGORIES;
}

export function getCategoryLabel(
  category: WardrobeCategoryId,
  gender: WardrobeGender = 'unisex',
): string {
  const list = getCategoriesForGender(gender);
  return (
    list.find((c) => c.id === category)?.label ??
    UNISEX_CATEGORIES.find((c) => c.id === category)?.label ??
    category
  );
}

export function cleanFileLabel(filename: string, fallback: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  if (!withoutExt) return fallback;
  return withoutExt
    .split(/\s+/)
    .slice(0, 5)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .slice(0, 64);
}

function resizeWithCanvas(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number,
): string {
  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function prepareWardrobeImagePair(file: File): Promise<{
  imageUrl: string;
  syncThumbnailUrl: string;
  colorHex: string;
}> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read uploaded file.'));
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  return prepareWardrobeImagePairFromUrl(rawDataUrl);
}

export async function prepareWardrobeImagePairFromUrl(sourceUrl: string): Promise<{
  imageUrl: string;
  syncThumbnailUrl: string;
  colorHex: string;
}> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Unable to decode uploaded image.'));
    el.src = sourceUrl;
  });

  const displayUrl = resizeWithCanvas(img, 800, 0.85) || sourceUrl;
  let syncUrl = resizeWithCanvas(img, 360, 0.72) || displayUrl;
  if (syncUrl.length > 160_000) {
    syncUrl = resizeWithCanvas(img, 280, 0.62) || syncUrl;
  }

  // Sample center-area dominant color quickly
  let colorHex = '#4A4945';
  try {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 24;
    sampleCanvas.height = 24;
    const sctx = sampleCanvas.getContext('2d');
    if (sctx) {
      sctx.drawImage(img, 0, 0, 24, 24);
      const data = sctx.getImageData(6, 6, 12, 12).data;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      const pxCount = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        rSum += data[i];
        gSum += data[i + 1];
        bSum += data[i + 2];
      }
      const toHex = (n: number) =>
        Math.max(0, Math.min(255, Math.round(n / pxCount)))
          .toString(16)
          .padStart(2, '0')
          .toUpperCase();
      colorHex = `#${toHex(rSum)}${toHex(gSum)}${toHex(bSum)}`;
    }
  } catch {
    // Default color hex
  }

  return {
    imageUrl: displayUrl,
    syncThumbnailUrl: syncUrl,
    colorHex,
  };
}

// IndexedDB persistence for full user closet (works offline and across page refreshes)
const IDB_NAME = 'atelier_edit_closet_db';
const IDB_VERSION = 1;
const STORE_NAME = 'wardrobeItems';
const LS_FALLBACK_KEY = 'atelier_edit_closet_fallback_v1';

function openClosetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

export async function loadClosetItemsLocal(): Promise<WardrobeItem[]> {
  try {
    const db = await openClosetDb();
    return await new Promise<WardrobeItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? (req.result as WardrobeItem[]) : [];
        rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        resolve(rows);
      };
      req.onerror = () => reject(req.error ?? new Error('Failed to read closet items'));
    });
  } catch {
    try {
      const raw = window.localStorage.getItem(LS_FALLBACK_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as WardrobeItem[]) : [];
    } catch {
      return [];
    }
  }
}

export async function saveClosetItemLocal(item: WardrobeItem): Promise<void> {
  try {
    const db = await openClosetDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save item'));
    });
  } catch {
    try {
      const existing = await loadClosetItemsLocal();
      const next = [item, ...existing.filter((x) => x.id !== item.id)];
      window.localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota fallback errors
    }
  }
}

export async function deleteClosetItemLocal(itemId: string): Promise<void> {
  try {
    const db = await openClosetDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(itemId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to delete item'));
    });
  } catch {
    try {
      const existing = await loadClosetItemsLocal();
      const next = existing.filter((x) => x.id !== itemId);
      window.localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage fallback errors
    }
  }
}

export async function clearClosetItemsLocal(): Promise<void> {
  try {
    const db = await openClosetDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to clear closet'));
    });
  } catch {
    try {
      window.localStorage.removeItem(LS_FALLBACK_KEY);
    } catch {
      // Ignore
    }
  }
}

export function resolveOutfitPiecesWithCloset(
  outfitPieces: Array<{
    slot: string;
    name: string;
    colorName: string;
    colorHex: string;
    material: string;
    stylingTip: string;
    wardrobeItemId?: string;
    category?: WardrobeCategoryId;
    imageUrl?: string;
  }>,
  closetItems: WardrobeItem[],
) {
  const byId = new Map(closetItems.map((i) => [i.id, i]));
  return outfitPieces.map((piece) => {
    const matched = piece.wardrobeItemId ? byId.get(piece.wardrobeItemId) : undefined;
    return {
      ...piece,
      category: matched?.category ?? piece.category,
      imageUrl: matched?.imageUrl ?? piece.imageUrl,
    };
  });
}
