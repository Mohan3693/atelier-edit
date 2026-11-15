import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import type { OutfitOption, WardrobeItem } from '../types/stylist';
import { normalizeHexColor } from '../utils/stylist';
import { renderOutfitCollageDataUrl } from '../utils/collageExport';
import { OutfitCollageBoard } from './OutfitCollageBoard';

interface LookLightboxModalProps {
  outfit: OutfitOption | null;
  closetItems: WardrobeItem[];
  anchorItemName: string;
  anchorImageUrl: string;
  onClose: () => void;
}

export function LookLightboxModal({
  outfit,
  closetItems,
  anchorItemName,
  anchorImageUrl,
  onClose,
}: LookLightboxModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!outfit) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [outfit, onClose]);

  if (!outfit) return null;

  const handleDownloadPng = async () => {
    setIsDownloading(true);
    try {
      const pngUrl =
        outfit.flatLayImageUrl && outfit.pieces.every((p) => !p.wardrobeItemId)
          ? outfit.flatLayImageUrl
          : await renderOutfitCollageDataUrl(outfit, closetItems);
      if (pngUrl) {
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${outfit.occasion.toLowerCase().replace(/\s+/g, '-')}-outfit.png`;
        a.click();
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E4E4E7] rounded-t-2xl sm:rounded-2xl max-w-4xl w-full max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto grid grid-cols-1 md:grid-cols-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden pt-3 pb-1 flex justify-center bg-[#F8F8F7]">
          <span className="w-10 h-1 rounded-full bg-[#D4D4D8]" aria-hidden="true" />
        </div>

        <div className="md:col-span-7 bg-[#F5F4F0] flex items-center justify-center p-4 sm:p-6 border-b md:border-b-0 md:border-r border-[#E4E4E7]">
          <div className="w-full aspect-[3/4] max-h-[65dvh] rounded-xl overflow-hidden border border-[#E4E4E7]">
            <OutfitCollageBoard
              outfit={outfit}
              closetItems={closetItems}
              anchorImageUrl={anchorImageUrl}
              anchorItemName={anchorItemName}
            />
          </div>
        </div>

        <div className="md:col-span-5 p-4 sm:p-6 flex flex-col justify-between gap-5 sm:gap-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#9E1B32]">
                  {outfit.occasion} · {anchorItemName}
                </p>
                <h3
                  id="lightbox-title"
                  className="font-display text-2xl sm:text-3xl font-semibold text-[#141413] mt-1"
                >
                  {outfit.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close outfit viewer"
                className="w-11 h-11 rounded-lg border border-[#E4E4E7] flex items-center justify-center text-[#141413] hover:bg-[#F8F8F7] active:bg-[#EFEFEF] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-sm text-[#575652] leading-relaxed">{outfit.moodSummary}</p>

            <ul className="divide-y divide-[#EFEFEF] border-t border-b border-[#EFEFEF]">
              {outfit.pieces.map((piece, idx) => (
                <li key={idx} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block text-[11px] text-[#787772]">{piece.slot}</span>
                    <span className="block text-sm font-medium text-[#141413]">
                      {piece.name}
                    </span>
                    <span className="block text-xs text-[#575652]">{piece.stylingTip}</span>
                  </div>
                  <span
                    className="w-4 h-4 rounded-sm border border-black/15 shrink-0 mt-1"
                    style={{ backgroundColor: normalizeHexColor(piece.colorHex) }}
                    title={piece.colorName}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => void handleDownloadPng()}
              className="inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 text-xs font-semibold text-white bg-[#141413] rounded-lg hover:bg-[#2C2C2A] flex-1 sm:flex-initial cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {isDownloading ? 'Rendering...' : 'Download Outfit PNG'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto min-h-11 px-4 py-2.5 text-xs font-medium text-[#575652] hover:text-[#141413] rounded-lg border border-[#E4E4E7] sm:border-transparent cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
