import { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  ChevronUp,
  FileDown,
  Maximize2,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  OutfitOption,
  PaletteFilterOption,
  PaletteSwatch,
  SavedLook,
} from '../types/stylist';
import {
  countOutfitsByPalette,
  filterOutfitsByPalette,
  getOutfitPaletteCategory,
  isOutfitSaved,
  normalizeHexColor,
  PALETTE_FILTER_OPTIONS,
  validateEditPrompt,
} from '../utils/stylist';
import { FlatLayFallbackBoard } from './FlatLayFallbackBoard';

interface OutfitGridProps {
  outfits: OutfitOption[];
  anchorPalette: PaletteSwatch[];
  anchorImageUrl: string;
  anchorItemName: string;
  savedLooks: SavedLook[];
  editingOutfitId: string | null;
  isRefreshingAll: boolean;
  onRetryFlatLay: (outfitId: string) => void;
  onApplyPromptEdit: (outfitId: string, prompt: string) => Promise<{ ok: boolean; error?: string }>;
  onToggleSave: (outfit: OutfitOption) => void;
  onInspectLook: (outfit: OutfitOption) => void;
  onRefreshAllOutfits: () => void;
  onExportAllToPdf: (visibleOutfits: OutfitOption[]) => Promise<{ ok: boolean; message: string }>;
}

const QUICK_REFINEMENTS: Record<string, string[]> = {
  Casual: [
    'Swap sneakers for tan suede ankle boots',
    'Replace denim jacket with an oatmeal cardigan',
    'Add a structured canvas market tote',
  ],
  Business: [
    'Replace charcoal blazer with a camel trench coat',
    'Swap black loafers for burgundy leather pumps',
    'Add tortoise-frame optical glasses',
  ],
  'Night Out': [
    'Swap bronze heels for velvet black slingbacks',
    'Add a cropped faux-fur evening jacket',
    'Replace earrings with minimalist silver cuffs',
  ],
};

export function OutfitGrid({
  outfits,
  anchorPalette,
  anchorImageUrl,
  anchorItemName,
  savedLooks,
  editingOutfitId,
  isRefreshingAll,
  onRetryFlatLay,
  onApplyPromptEdit,
  onToggleSave,
  onInspectLook,
  onRefreshAllOutfits,
  onExportAllToPdf,
}: OutfitGridProps) {
  const [activePaletteFilter, setActivePaletteFilter] =
    useState<PaletteFilterOption>('All');
  const [openEditorId, setOpenEditorId] = useState<string | null>(null);
  const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>({});
  const [promptErrors, setPromptErrors] = useState<Record<string, string>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [quickActionNotice, setQuickActionNotice] = useState<string | null>(null);
  const quickMenuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActivePaletteFilter('All');
  }, [anchorItemName]);

  useEffect(() => {
    if (!isQuickMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsQuickMenuOpen(false);
      }
    };
    const handlePointerDown = (e: MouseEvent) => {
      if (
        quickMenuContainerRef.current &&
        !quickMenuContainerRef.current.contains(e.target as Node)
      ) {
        setIsQuickMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isQuickMenuOpen]);

  const paletteCounts = countOutfitsByPalette(outfits, anchorPalette);
  const filteredOutfits = filterOutfitsByPalette(
    outfits,
    activePaletteFilter,
    anchorPalette,
  );

  const handleRefreshAllClick = () => {
    setIsQuickMenuOpen(false);
    setQuickActionNotice(null);
    onRefreshAllOutfits();
  };

  const handleExportPdfClick = async () => {
    setIsExportingPdf(true);
    setQuickActionNotice(null);
    const targetList = filteredOutfits.length > 0 ? filteredOutfits : outfits;
    const result = await onExportAllToPdf(targetList);
    setIsExportingPdf(false);
    setIsQuickMenuOpen(false);
    setQuickActionNotice(result.message);
  };

  const handleSubmitEdit = async (outfitId: string) => {
    const raw = promptDrafts[outfitId] ?? '';
    const check = validateEditPrompt(raw);
    if (!check.valid) {
      setPromptErrors((prev) => ({ ...prev, [outfitId]: check.error || 'Invalid prompt.' }));
      return;
    }
    setPromptErrors((prev) => {
      const next = { ...prev };
      delete next[outfitId];
      return next;
    });

    const result = await onApplyPromptEdit(outfitId, check.cleaned);
    if (!result.ok && result.error) {
      setPromptErrors((prev) => ({ ...prev, [outfitId]: result.error! }));
    } else if (result.ok) {
      setPromptDrafts((prev) => ({ ...prev, [outfitId]: '' }));
    }
  };

  return (
    <section
      id="outfit-looks"
      aria-label="Three styled flat-lay outfit options"
      className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 sm:py-12 border-b border-[#E4E4E7]"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <p className="text-xs font-medium text-[#575652]">
            Flat-Lay Lookbook · 03 Occasions
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#141413] tracking-tight mt-1">
            Three Distinct Ways to Wear It
          </h2>
        </div>
        <p className="text-sm text-[#575652] max-w-md">
          Each outfit adapts your anchor piece across daylight, tailored workwear, and evening
          proportions. Refine any flat-lay with a text prompt.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-6 sm:mb-8">
        <div
          role="group"
          aria-label="Filter looks by color palette category"
          className="w-full sm:w-auto flex sm:inline-flex items-center gap-1 p-1 bg-[#EFEFEF] rounded-xl overflow-x-auto no-scrollbar"
        >
          {PALETTE_FILTER_OPTIONS.map((option) => {
            const count = paletteCounts[option];
            const isActive = activePaletteFilter === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActivePaletteFilter(option)}
                className={`min-h-10 sm:min-h-8 px-3.5 sm:px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg sm:rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer focus-visible:outline-2 focus-visible:outline-[#141413] ${
                  isActive
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#575652] hover:text-[#141413]'
                }`}
              >
                {option} ({count})
              </button>
            );
          })}
        </div>

        <span className="text-xs text-[#575652] tabular-nums">
          Showing {filteredOutfits.length} of {outfits.length} looks
        </span>
      </div>

      {filteredOutfits.length === 0 ? (
        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-10 text-center">
          <p className="font-display text-2xl text-[#141413]">
            No {activePaletteFilter} Looks in This Set
          </p>
          <p className="text-sm text-[#575652] mt-1.5 max-w-md mx-auto">
            None of the current outfits for {anchorItemName} use a {activePaletteFilter}{' '}
            palette strategy. View all looks or re-analyze the piece for fresh combinations.
          </p>
          <button
            type="button"
            onClick={() => setActivePaletteFilter('All')}
            className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-[#141413] rounded-lg hover:bg-[#2C2C2A] transition-colors cursor-pointer"
          >
            Show All Looks
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          {filteredOutfits.map((outfit) => {
            const originalIndex = outfits.findIndex((o) => o.id === outfit.id);
            const lookNumber = originalIndex >= 0 ? originalIndex + 1 : 1;
            const paletteCategory = getOutfitPaletteCategory(outfit, anchorPalette);
            const saved = isOutfitSaved(savedLooks, outfit.id);
            const isEditorOpen = openEditorId === outfit.id;
            const isEditing = editingOutfitId === outfit.id;
            const hasImage =
              Boolean(outfit.flatLayImageUrl) &&
              outfit.flatLayStatus === 'ready' &&
              !failedImages[outfit.id];

            const suggestions = QUICK_REFINEMENTS[outfit.occasion] ?? QUICK_REFINEMENTS.Casual;

            return (
              <article
                key={outfit.id}
                data-testid={`outfit-card-${outfit.occasion.toLowerCase().replace(/\s+/g, '-')}`}
                className="bg-white border border-[#E4E4E7] rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[3/4] bg-[#F8F8F7] border-b border-[#EFEFEF] overflow-hidden group">
                  {hasImage ? (
                    <>
                      <img
                        src={outfit.flatLayImageUrl!}
                        alt={`${outfit.occasion} flat-lay outfit: ${outfit.title}`}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [outfit.id]: true }))
                        }
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <button
                        type="button"
                        onClick={() => onInspectLook(outfit)}
                        aria-label={`Inspect ${outfit.occasion} flat-lay: ${outfit.title}`}
                        className="absolute bottom-3 left-3 sm:left-auto sm:right-3 min-h-10 sm:min-h-0 px-3.5 sm:px-3 py-2 sm:py-1.5 rounded-lg bg-[#141413]/85 text-white text-xs font-medium inline-flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Inspect
                      </button>
                    </>
                  ) : (
                    <FlatLayFallbackBoard
                      outfit={outfit}
                      anchorImageUrl={anchorImageUrl}
                      anchorItemName={anchorItemName}
                      onRetryPhoto={() => onRetryFlatLay(outfit.id)}
                    />
                  )}
                </div>

                <div className="p-4 sm:p-6 flex-1 flex flex-col gap-4 sm:gap-5">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#575652]">
                      <span className="font-semibold text-[#9E1B32]">{outfit.occasion}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">Look 0{lookNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>{paletteCategory}</span>
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-[#141413] tracking-tight">
                      {outfit.title}
                    </h3>
                    <p className="text-sm text-[#575652] leading-relaxed">
                      {outfit.moodSummary}
                    </p>
                </div>

                <div className="border-t border-[#EFEFEF] pt-4">
                  <h4 className="text-xs font-semibold text-[#575652] mb-2.5">
                    Curated Pieces
                  </h4>
                  <ul className="divide-y divide-[#EFEFEF]">
                    {outfit.pieces.map((piece, pIdx) => {
                      const hex = normalizeHexColor(piece.colorHex);
                      return (
                        <li
                          key={`${piece.slot}-${pIdx}`}
                          className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <span className="block text-[11px] font-medium text-[#787772]">
                              {piece.slot} · {piece.material}
                            </span>
                            <span className="block text-sm font-medium text-[#141413] mt-0.5">
                              {piece.name}
                            </span>
                            <span className="block text-xs text-[#575652] mt-0.5">
                              {piece.stylingTip}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                            <span
                              className="w-3.5 h-3.5 rounded-sm border border-black/15"
                              style={{ backgroundColor: hex }}
                              aria-hidden="true"
                            />
                            <span className="text-[11px] text-[#575652] whitespace-nowrap">
                              {piece.colorName}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <p className="text-xs leading-relaxed text-[#575652] bg-[#F8F8F7] rounded-lg p-3">
                  <strong className="font-semibold text-[#141413]">Color Harmony: </strong>
                  {outfit.colorHarmonyNote}
                </p>

                {isEditorOpen && (
                  <div className="border-t border-[#EFEFEF] pt-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor={`edit-prompt-${outfit.id}`}
                        className="text-xs font-semibold text-[#141413]"
                      >
                        Refine Flat-Lay with Prompt
                      </label>
                      <span className="text-[11px] text-[#787772]">gemini-nano-banana-2.1</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() =>
                            setPromptDrafts((prev) => ({ ...prev, [outfit.id]: suggestion }))
                          }
                          className="text-xs sm:text-[11px] text-left min-h-10 sm:min-h-0 px-3 sm:px-2.5 py-2 sm:py-1 rounded-lg sm:rounded-md bg-[#F8F8F7] border border-[#E4E4E7] text-[#575652] hover:text-[#141413] hover:border-[#141413] transition-colors cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        id={`edit-prompt-${outfit.id}`}
                        type="text"
                        value={promptDrafts[outfit.id] ?? ''}
                        onChange={(e) =>
                          setPromptDrafts((prev) => ({
                            ...prev,
                            [outfit.id]: e.target.value,
                          }))
                        }
                        placeholder="e.g., Swap loafers for white sneakers..."
                        className="flex-1 min-w-0 h-11 sm:h-9 px-3 text-base sm:text-xs bg-white border border-[#E4E4E7] rounded-lg text-[#141413] placeholder:text-[#8E8D88] focus-visible:outline-2 focus-visible:outline-[#141413]"
                      />
                      <button
                        type="button"
                        disabled={isEditing}
                        onClick={() => handleSubmitEdit(outfit.id)}
                        className="px-4 sm:px-3.5 h-11 sm:h-9 text-xs font-semibold text-white bg-[#141413] rounded-lg hover:bg-[#2C2C2A] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {isEditing ? 'Editing...' : 'Apply'}
                      </button>
                    </div>

                    {promptErrors[outfit.id] && (
                      <p role="alert" className="text-xs text-[#9E1B32]">
                        {promptErrors[outfit.id]}
                      </p>
                    )}

                    {outfit.editHistory.length > 0 && (
                      <p className="text-[11px] text-[#787772]">
                        Applied edits: {outfit.editHistory.join(' · ')}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-[#EFEFEF] flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-expanded={isEditorOpen}
                    onClick={() =>
                      setOpenEditorId((curr) => (curr === outfit.id ? null : outfit.id))
                    }
                    className="inline-flex items-center justify-center gap-1.5 min-h-11 sm:min-h-9 px-3.5 sm:px-3 py-2 text-xs font-medium text-[#141413] bg-[#F8F8F7] border border-[#E4E4E7] rounded-lg hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isEditing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    Refine Flat-Lay
                  </button>

                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <button
                      type="button"
                      onClick={() => onInspectLook(outfit)}
                      className="min-h-11 sm:min-h-9 px-3 py-2 text-xs font-medium text-[#575652] hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center"
                    >
                      Inspect
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleSave(outfit)}
                      aria-pressed={saved}
                      className={`inline-flex items-center justify-center gap-1.5 min-h-11 sm:min-h-9 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        saved
                          ? 'bg-[#141413] text-white'
                          : 'bg-white border border-[#E4E4E7] text-[#141413] hover:border-[#141413]'
                      }`}
                    >
                      <Bookmark
                        className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`}
                        aria-hidden="true"
                      />
                      {saved ? 'Saved' : 'Save Look'}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        </div>
      )}

      <div className="sticky bottom-4 z-30 mt-6 sm:mt-8 flex justify-end pointer-events-none">
        <div
          ref={quickMenuContainerRef}
          className="relative flex flex-col items-end gap-2 pointer-events-auto max-w-full"
        >
          {quickActionNotice && (
            <div
              role="status"
              className="max-w-[calc(100vw-2rem)] sm:max-w-md bg-white border border-[#E4E4E7] rounded-lg px-3.5 py-2.5 shadow-sm flex items-center justify-between gap-3 text-xs text-[#141413]"
            >
              <span className="break-words min-w-0">{quickActionNotice}</span>
              <button
                type="button"
                onClick={() => setQuickActionNotice(null)}
                aria-label="Dismiss quick action notice"
                className="min-h-9 px-1.5 text-[#575652] hover:text-[#141413] font-medium cursor-pointer shrink-0 inline-flex items-center"
              >
                Dismiss
              </button>
            </div>
          )}

          {isQuickMenuOpen && (
            <div
              role="menu"
              aria-label="Outfit grid quick actions"
              className="w-60 sm:w-56 bg-white border border-[#E4E4E7] rounded-xl shadow-lg p-1.5 flex flex-col gap-1"
            >
              <button
                type="button"
                role="menuitem"
                disabled={isRefreshingAll}
                onClick={handleRefreshAllClick}
                className="w-full min-h-11 px-3 py-2.5 text-left text-xs font-medium text-[#141413] rounded-lg hover:bg-[#F8F8F7] disabled:opacity-50 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-[#575652] ${isRefreshingAll ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{isRefreshingAll ? 'Refreshing Outfits...' : 'Refresh All Outfits'}</span>
              </button>

              <button
                type="button"
                role="menuitem"
                disabled={isExportingPdf}
                onClick={handleExportPdfClick}
                className="w-full min-h-11 px-3 py-2.5 text-left text-xs font-medium text-[#141413] rounded-lg hover:bg-[#F8F8F7] disabled:opacity-50 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-[#575652]" aria-hidden="true" />
                <span>{isExportingPdf ? 'Exporting PDF...' : 'Export All to PDF'}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isQuickMenuOpen}
            onClick={() => setIsQuickMenuOpen((prev) => !prev)}
            className="min-h-11 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#141413] rounded-lg shadow-lg hover:bg-[#2C2C2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141413]"
          >
            {isRefreshingAll ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ChevronUp
                className={`w-3.5 h-3.5 transition-transform ${isQuickMenuOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            )}
            Quick Actions
          </button>
        </div>
      </div>
    </section>
  );
}
