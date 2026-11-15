import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Check, Pin, Plus, RefreshCw, Sparkles, Trash2, Upload } from 'lucide-react';
import type {
  WardrobeCategoryId,
  WardrobeGender,
  WardrobeItem,
} from '../types/stylist';
import { getCategoriesForGender } from '../utils/wardrobe';

interface ClosetStudioProps {
  gender: WardrobeGender;
  season: string;
  aesthetic: string;
  closetItems: WardrobeItem[];
  anchorItemId: string | null;
  isComposing: boolean;
  composeError: string | null;
  onGenderChange: (gender: WardrobeGender) => void;
  onSeasonChange: (season: string) => void;
  onAestheticChange: (aesthetic: string) => void;
  onUploadFilesToCategory: (files: FileList | File[], category: WardrobeCategoryId) => Promise<void>;
  onUpdateItemLabel: (itemId: string, label: string) => void;
  onMoveItemCategory: (itemId: string, category: WardrobeCategoryId) => void;
  onDeleteItem: (itemId: string) => void;
  onToggleAnchorItem: (itemId: string) => void;
  onLoadStarterCloset: () => Promise<void>;
  onGenerateOutfits: () => void;
}

const GENDER_OPTIONS: Array<{ id: WardrobeGender; label: string; shortLabel: string }> = [
  { id: 'male', label: 'Male (Menswear)', shortLabel: 'Male' },
  { id: 'female', label: 'Female (Womenswear)', shortLabel: 'Female' },
  { id: 'unisex', label: 'All / Unisex', shortLabel: 'Unisex' },
];

export function ClosetStudio({
  gender,
  season,
  aesthetic,
  closetItems,
  anchorItemId,
  isComposing,
  composeError,
  onGenderChange,
  onSeasonChange,
  onAestheticChange,
  onUploadFilesToCategory,
  onUpdateItemLabel,
  onMoveItemCategory,
  onDeleteItem,
  onToggleAnchorItem,
  onLoadStarterCloset,
  onGenerateOutfits,
}: ClosetStudioProps) {
  const categories = getCategoriesForGender(gender);
  const [activeCategory, setActiveCategory] = useState<WardrobeCategoryId | 'all'>('tops');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const multiInputRef = useRef<HTMLInputElement | null>(null);

  const selectedUploadCategory: WardrobeCategoryId =
    activeCategory === 'all' ? categories[0].id : activeCategory;

  const activeCategoryMeta =
    categories.find((c) => c.id === selectedUploadCategory) ?? categories[0];

  const countsByCategory = closetItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});

  const visibleItems =
    activeCategory === 'all'
      ? closetItems
      : closetItems.filter((item) => item.category === activeCategory);

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      await onUploadFilesToCategory(files, selectedUploadCategory);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(e.target.files);
    }
    e.target.value = '';
  };

  const categoriesFilled = Object.keys(countsByCategory).length;

  return (
    <section
      id="style-studio"
      aria-label="Personal digital closet and outfit builder"
      className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-6 pb-10 sm:pt-10 sm:pb-14 border-b border-[#E4E4E7]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-start">
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-wide text-[#575652]">
              Personal Wardrobe Vault · Real-Photo Stylist
            </p>
            <h1 className="font-display text-[clamp(2rem,4.2vw,3.5rem)] font-semibold leading-[1.06] tracking-tight text-[#141413] text-balance max-w-xl">
              Your real closet. Three styled outfits.
            </h1>
            <p className="text-[15px] leading-relaxed text-[#575652] max-w-lg">
              Choose your wardrobe profile, upload your shirts, trousers or dresses, shoes,
              watches, specs, and bags once. We store them and compose 3 complete outfits strictly
              from what you actually own.
            </p>
          </div>

          <div className="space-y-4 bg-white border border-[#E4E4E7] rounded-2xl p-4 sm:p-5">
            <div>
              <span className="block text-xs font-medium text-[#575652] mb-2">
                1. Select Wardrobe Profile
              </span>
              <div
                role="group"
                aria-label="Wardrobe gender profile"
                className="grid grid-cols-3 gap-1 p-1 bg-[#EFEFEF] rounded-xl"
              >
                {GENDER_OPTIONS.map((opt) => {
                  const isActive = gender === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => {
                        onGenderChange(opt.id);
                        if (opt.id === 'male' && activeCategory === 'dresses') {
                          setActiveCategory('tops');
                        }
                      }}
                      className={`min-h-11 sm:min-h-10 px-2.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-white text-[#141413] shadow-xs'
                          : 'text-[#575652] hover:text-[#141413]'
                      }`}
                    >
                      <span className="sm:hidden">{opt.shortLabel}</span>
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="season-select"
                  className="block text-xs font-medium text-[#575652] mb-1.5"
                >
                  Season Context
                </label>
                <select
                  id="season-select"
                  value={season}
                  onChange={(e) => onSeasonChange(e.target.value)}
                  className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-[#F8F8F7] border border-[#E4E4E7] rounded-lg text-[#141413] focus-visible:outline-2 focus-visible:outline-[#141413]"
                >
                  <option value="All-Season">All-Season Versatility</option>
                  <option value="Spring / Summer">Spring / Summer</option>
                  <option value="Autumn / Winter">Autumn / Winter</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="aesthetic-select"
                  className="block text-xs font-medium text-[#575652] mb-1.5"
                >
                  Styling Direction
                </label>
                <select
                  id="aesthetic-select"
                  value={aesthetic}
                  onChange={(e) => onAestheticChange(e.target.value)}
                  className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-[#F8F8F7] border border-[#E4E4E7] rounded-lg text-[#141413] focus-visible:outline-2 focus-visible:outline-[#141413]"
                >
                  <option value="Modern Editorial">Modern Editorial</option>
                  <option value="Minimalist Classic">Minimalist Classic</option>
                  <option value="Smart Casual">Smart Casual</option>
                  <option value="Streetwear">Clean Streetwear</option>
                  <option value="Evening Luxury">Evening Tailored</option>
                </select>
              </div>
            </div>

            {composeError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-[#FDF2F4] border border-[#F3C5CE] text-xs text-[#881327]"
              >
                {composeError}
              </div>
            )}

            <div className="pt-1 space-y-2.5">
              <button
                type="button"
                onClick={onGenerateOutfits}
                disabled={isComposing || closetItems.length < 2}
                className="w-full min-h-12 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#9E1B32] rounded-lg hover:bg-[#821529] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
              >
                {isComposing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Composing 3 Real-Photo Outfits...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    Generate 3 Outfits from My Closet
                  </>
                )}
              </button>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#575652]">
                <span className="tabular-nums">
                  {closetItems.length} {closetItems.length === 1 ? 'item' : 'items'} across{' '}
                  {categoriesFilled} {categoriesFilled === 1 ? 'category' : 'categories'}
                  {closetItems.length < 2 ? ' · Upload at least 2 items' : ''}
                </span>
                {closetItems.length < 2 && (
                  <button
                    type="button"
                    onClick={() => void onLoadStarterCloset()}
                    className="min-h-9 px-1 font-semibold text-[#141413] hover:underline cursor-pointer whitespace-nowrap inline-flex items-center"
                  >
                    Load Starter Pieces
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-[#E4E4E7] rounded-2xl p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#141413] tracking-tight">
                2. Upload Your Clothes &amp; Accessories
              </h2>
              <p className="text-xs text-[#575652] mt-0.5">
                Pick a category tab and add photos (you can select multiple files at once).
              </p>
            </div>
            <button
              type="button"
              onClick={() => multiInputRef.current?.click()}
              disabled={isUploading}
              className="min-h-10 px-4 py-2 text-xs font-semibold text-white bg-[#141413] rounded-lg hover:bg-[#2C2C2A] inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Add to {activeCategoryMeta.shortLabel}
            </button>
          </div>

          <div
            role="tablist"
            aria-label="Wardrobe categories"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
              className={`min-h-10 sm:min-h-9 px-3.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#141413] text-white border-[#141413]'
                  : 'bg-[#F8F8F7] text-[#575652] border-[#E4E4E7] hover:text-[#141413]'
              }`}
            >
              All ({closetItems.length})
            </button>
            {categories.map((cat) => {
              const count = countsByCategory[cat.id] ?? 0;
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`min-h-10 sm:min-h-9 px-3.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                    isSelected
                      ? 'bg-[#141413] text-white border-[#141413]'
                      : 'bg-[#F8F8F7] text-[#575652] border-[#E4E4E7] hover:text-[#141413]'
                  }`}
                >
                  <span className="sm:hidden">{cat.shortLabel} ({count})</span>
                  <span className="hidden sm:inline">{cat.label} ({count})</span>
                </button>
              );
            })}
          </div>

          <input
            ref={multiInputRef}
            id="closet-multi-file-input"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileInputChange}
            aria-hidden="true"
            tabIndex={-1}
            className="hidden"
          />

          <div
            onDragOver={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.length) {
                void handleFiles(e.dataTransfer.files);
              }
            }}
            className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-dashed transition-colors ${
              isDragging
                ? 'border-[#9E1B32] bg-[#FAF3F4]/40'
                : 'border-[#C8C7C2] bg-[#F8F8F7] hover:border-[#141413]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-white border border-[#E4E4E7] flex items-center justify-center text-[#141413] shrink-0">
                {isUploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="w-4 h-4" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <span className="block text-sm font-semibold text-[#141413]">
                  Upload {activeCategoryMeta.label}
                </span>
                <span className="block text-xs text-[#575652]">
                  {activeCategoryMeta.placeholder} · PNG, JPEG, or WebP
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => multiInputRef.current?.click()}
              disabled={isUploading}
              className="min-h-10 px-4 py-2 text-xs font-medium text-[#141413] bg-white border border-[#E4E4E7] rounded-lg hover:border-[#141413] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isUploading ? 'Saving...' : 'Choose Photos'}
            </button>
          </div>

          {visibleItems.length === 0 ? (
            <div className="py-10 px-4 text-center bg-[#F8F8F7] rounded-xl border border-[#EFEFEF]">
              <p className="font-display text-xl text-[#141413]">
                No {activeCategory === 'all' ? 'items' : activeCategoryMeta.label} uploaded yet
              </p>
              <p className="text-xs text-[#575652] mt-1 max-w-sm mx-auto">
                Add photos of your real {activeCategoryMeta.label.toLowerCase()} above. Everything is
                saved automatically so you never have to re-upload.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {visibleItems.map((item) => {
                const isPinned = anchorItemId === item.id;
                const isEditingName = editingId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-xl overflow-hidden flex flex-col ${
                      isPinned ? 'border-[#9E1B32] ring-1 ring-[#9E1B32]/30' : 'border-[#E4E4E7]'
                    }`}
                  >
                    <div className="relative aspect-square bg-[#F8F8F7] p-2 flex items-center justify-center">
                      <img
                        src={item.imageUrl}
                        alt={item.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => onToggleAnchorItem(item.id)}
                        title={
                          isPinned
                            ? 'Pinned: featured in all 3 outfits (click to unpin)'
                            : 'Pin item to guarantee it appears in all 3 outfits'
                        }
                        aria-pressed={isPinned}
                        className={`absolute top-1.5 left-1.5 w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
                          isPinned
                            ? 'bg-[#9E1B32] text-white border-[#9E1B32]'
                            : 'bg-white/95 text-[#575652] border-[#E4E4E7] hover:text-[#141413]'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        aria-label={`Remove ${item.label}`}
                        className="absolute top-1.5 right-1.5 w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-white/95 border border-[#E4E4E7] flex items-center justify-center text-[#575652] hover:text-[#9E1B32] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="p-2.5 border-t border-[#EFEFEF] space-y-1.5">
                      {isPinned && (
                        <span className="block text-[10px] font-semibold text-[#9E1B32]">
                          Pinned · In all 3 looks
                        </span>
                      )}
                      {isEditingName ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (labelDraft.trim()) {
                              onUpdateItemLabel(item.id, labelDraft.trim());
                            }
                            setEditingId(null);
                          }}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="text"
                            value={labelDraft}
                            onChange={(e) => setLabelDraft(e.target.value)}
                            autoFocus
                            className="w-full min-w-0 h-8 px-2 text-base sm:text-xs bg-[#F8F8F7] border border-[#141413] rounded"
                          />
                          <button
                            type="submit"
                            aria-label="Save item name"
                            className="w-8 h-8 rounded bg-[#141413] text-white flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setLabelDraft(item.label);
                          }}
                          className="w-full min-h-7 text-left text-xs font-semibold text-[#141413] truncate hover:underline cursor-pointer"
                          title="Click to rename item"
                        >
                          {item.label}
                        </button>
                      )}

                      <select
                        aria-label={`Category for ${item.label}`}
                        value={item.category}
                        onChange={(e) =>
                          onMoveItemCategory(item.id, e.target.value as WardrobeCategoryId)
                        }
                        className="w-full h-9 sm:h-8 px-2 text-xs text-[#575652] bg-[#F8F8F7] border border-[#E4E4E7] rounded-md cursor-pointer"
                      >
                        {!categories.some((c) => c.id === item.category) && (
                          <option value={item.category}>{item.category}</option>
                        )}
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.shortLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
