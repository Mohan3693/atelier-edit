import { useMemo, useState } from 'react';
import { Bookmark, Download } from 'lucide-react';
import type {
  OccasionType,
  OutfitOption,
  OutfitPiece,
  WardrobeCategoryId,
  WardrobeGender,
  WardrobeItem,
} from '../types/stylist';
import { getCategoriesForGender } from '../utils/wardrobe';
import { renderOutfitCollageDataUrl } from '../utils/collageExport';
import { OutfitCollageBoard } from './OutfitCollageBoard';

interface MixMatchStudioProps {
  gender: WardrobeGender;
  closetItems: WardrobeItem[];
  onSaveCustomLook: (outfit: OutfitOption) => void;
}

const SLOT_ORDER: WardrobeCategoryId[] = [
  'tops',
  'dresses',
  'outerwear',
  'bottoms',
  'shoes',
  'bags',
  'watches',
  'eyewear',
  'accessories',
];

export function MixMatchStudio({
  gender,
  closetItems,
  onSaveCustomLook,
}: MixMatchStudioProps) {
  const categories = getCategoriesForGender(gender);
  const [selectedByCat, setSelectedByCat] = useState<
    Partial<Record<WardrobeCategoryId, string>>
  >({});
  const [occasion, setOccasion] = useState<OccasionType>('Casual');
  const [customTitle, setCustomTitle] = useState('Personal Closet Pairing');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const itemsByCategory = useMemo(() => {
    const map = new Map<WardrobeCategoryId, WardrobeItem[]>();
    for (const item of closetItems) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [closetItems]);

  const populatedCategories = categories.filter(
    (cat) => (itemsByCategory.get(cat.id)?.length ?? 0) > 0,
  );

  const activePieces: OutfitPiece[] = useMemo(() => {
    const result: OutfitPiece[] = [];
    for (const catId of SLOT_ORDER) {
      const candidates = itemsByCategory.get(catId) ?? [];
      if (candidates.length === 0) continue;
      const chosenId = selectedByCat[catId];
      // Default to first item in key slots unless explicitly cleared ('')
      if (chosenId === '') continue;
      const matched =
        (chosenId ? candidates.find((c) => c.id === chosenId) : undefined) ??
        candidates[0];
      if (!matched) continue;
      const meta = categories.find((c) => c.id === catId);
      result.push({
        wardrobeItemId: matched.id,
        category: matched.category,
        imageUrl: matched.imageUrl,
        slot: meta?.shortLabel ?? matched.category,
        name: matched.label,
        colorName: matched.colorName,
        colorHex: matched.colorHex,
        material: 'Your wardrobe item',
        stylingTip: 'Combined directly from your stored closet.',
      });
    }
    return result;
  }, [categories, itemsByCategory, selectedByCat]);

  const draftOutfit: OutfitOption = useMemo(
    () => ({
      id: `custom-${occasion.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      occasion,
      title: customTitle.trim() || 'Personal Closet Pairing',
      moodSummary: `Custom ${occasion} look assembled from ${activePieces.length} of your uploaded wardrobe pieces.`,
      colorHarmonyNote: 'Mixed directly from your own clothes, shoes, watches, and accessories.',
      colorPaletteCategory: 'Neutral Tones',
      pieces: activePieces,
      flatLayPrompt: '',
      flatLayImageUrl: null,
      flatLayStatus: 'idle',
      editHistory: [],
    }),
    [activePieces, customTitle, occasion],
  );

  const handleDownloadPng = async () => {
    if (activePieces.length === 0) return;
    setIsExporting(true);
    try {
      const pngUrl = await renderOutfitCollageDataUrl(draftOutfit, closetItems);
      if (pngUrl) {
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${(draftOutfit.title || 'custom-outfit').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
        a.click();
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveLook = async () => {
    if (activePieces.length === 0) return;
    const pngUrl = await renderOutfitCollageDataUrl(draftOutfit, closetItems);
    onSaveCustomLook({
      ...draftOutfit,
      flatLayImageUrl: pngUrl || null,
      flatLayStatus: pngUrl ? 'ready' : 'idle',
    });
    setSavedNotice(`Saved "${draftOutfit.title}" to Saved Looks.`);
  };

  return (
    <section
      id="create-edit"
      aria-label="Interactive mix and match outfit builder"
      className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 sm:py-12 border-b border-[#E4E4E7]"
    >
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          <div className="lg:col-span-5 order-first lg:order-last flex flex-col">
            <div className="w-full aspect-[4/3] sm:aspect-[3/4] max-h-[460px] lg:max-h-[540px] rounded-2xl overflow-hidden border border-[#E4E4E7] bg-[#F8F8F7]">
              {activePieces.length > 0 ? (
                <OutfitCollageBoard outfit={draftOutfit} closetItems={closetItems} />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-6 text-center text-xs text-[#575652]">
                  Select pieces to preview your outfit collage board.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between gap-5">
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#575652]">
                Interactive Closet Composer · 100% Your Real Items
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#141413] tracking-tight">
                Mix &amp; Match Your Own Outfit
              </h2>
              <p className="text-sm text-[#575652] leading-relaxed max-w-xl">
                Pick any combination of shirts, trousers or skirts, shoes, watches, specs, and bags
                from your uploaded closet to preview an editorial outfit board and export it as a
                PNG.
              </p>
            </div>

            {populatedCategories.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#F8F8F7] border border-[#E4E4E7] text-sm text-[#575652]">
                Upload at least one clothing or accessory photo in your closet above to start
                mixing and matching pieces here.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="custom-look-title"
                      className="block text-xs font-medium text-[#575652] mb-1.5"
                    >
                      Outfit Name
                    </label>
                    <input
                      id="custom-look-title"
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      maxLength={80}
                      className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-[#F8F8F7] border border-[#E4E4E7] rounded-lg text-[#141413]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="custom-look-occasion"
                      className="block text-xs font-medium text-[#575652] mb-1.5"
                    >
                      Occasion
                    </label>
                    <select
                      id="custom-look-occasion"
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value as OccasionType)}
                      className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-[#F8F8F7] border border-[#E4E4E7] rounded-lg text-[#141413]"
                    >
                      <option value="Casual">Casual</option>
                      <option value="Business">Business</option>
                      <option value="Night Out">Night Out</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {populatedCategories.map((cat) => {
                    const list = itemsByCategory.get(cat.id) ?? [];
                    const currentVal = selectedByCat[cat.id] ?? list[0]?.id ?? '';
                    return (
                      <div key={cat.id}>
                        <label
                          htmlFor={`mix-select-${cat.id}`}
                          className="block text-xs font-medium text-[#575652] mb-1"
                        >
                          {cat.label}
                        </label>
                        <select
                          id={`mix-select-${cat.id}`}
                          value={currentVal}
                          onChange={(e) =>
                            setSelectedByCat((prev) => ({
                              ...prev,
                              [cat.id]: e.target.value,
                            }))
                          }
                          className="w-full h-11 sm:h-10 px-3 text-base sm:text-xs bg-white border border-[#E4E4E7] rounded-lg text-[#141413]"
                        >
                          <option value="">None (exclude {cat.shortLabel})</option>
                          {list.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                {savedNotice && (
                  <p role="status" className="text-xs font-medium text-[#141413]">
                    {savedNotice}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={activePieces.length === 0 || isExporting}
                    onClick={handleDownloadPng}
                    className="min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#141413] rounded-lg hover:bg-[#2C2C2A] disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    {isExporting ? 'Rendering PNG...' : 'Download Outfit PNG'}
                  </button>
                  <button
                    type="button"
                    disabled={activePieces.length === 0}
                    onClick={handleSaveLook}
                    className="min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#141413] bg-white border border-[#E4E4E7] rounded-lg hover:border-[#141413] disabled:opacity-50 cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
                    Save Custom Look
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
