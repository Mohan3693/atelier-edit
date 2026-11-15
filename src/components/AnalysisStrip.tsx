import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { ItemAnalysis } from '../types/stylist';
import { getContrastTextColor, normalizeHexColor } from '../utils/stylist';

interface AnalysisStripProps {
  analysis: ItemAnalysis;
  anchorImageUrl: string;
}

export function AnalysisStrip({ analysis, anchorImageUrl }: AnalysisStripProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const handleCopyHex = async (hex: string) => {
    const normalized = normalizeHexColor(hex);
    try {
      await navigator.clipboard.writeText(normalized);
      setCopiedHex(normalized);
      setTimeout(() => setCopiedHex((curr) => (curr === normalized ? null : curr)), 1600);
    } catch {
      setCopiedHex(normalized);
    }
  };

  return (
    <section
      aria-label="Garment palette and style analysis"
      className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 sm:py-10 border-b border-[#E4E4E7]"
    >
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          <div className="lg:col-span-7 flex flex-row items-start gap-4 sm:gap-6">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl bg-[#F8F8F7] border border-[#EFEFEF] overflow-hidden shrink-0 flex items-center justify-center">
              <img
                src={anchorImageUrl}
                alt={analysis.itemName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-1.5"
              />
            </div>

            <div className="space-y-2 sm:space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#575652]">
                <span>{analysis.category}</span>
                <span aria-hidden="true">·</span>
                <span>{analysis.stylePersonality}</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#141413] tracking-tight">
                {analysis.itemName}
              </h2>
              <p className="text-sm leading-relaxed text-[#575652]">
                {analysis.stylingStrategy}
              </p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-2 text-xs">
                <div>
                  <dt className="text-[#787772]">Silhouette</dt>
                  <dd className="text-[#141413] font-medium mt-0.5">{analysis.silhouette}</dd>
                </div>
                <div>
                  <dt className="text-[#787772]">Textile &amp; Pattern</dt>
                  <dd className="text-[#141413] font-medium mt-0.5">
                    {analysis.fabricAndTexture}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-[#575652]">
                Extracted Color Palette
              </h3>
              <span className="text-xs text-[#787772]">Tap swatch to copy</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {analysis.palette.map((swatch, idx) => {
                const hex = normalizeHexColor(swatch.hex);
                const textColor = getContrastTextColor(hex);
                const isCopied = copiedHex === hex;
                return (
                  <button
                    key={`${hex}-${idx}`}
                    type="button"
                    onClick={() => handleCopyHex(hex)}
                    aria-label={`Copy ${swatch.name} color ${hex}`}
                    className="group text-left rounded-lg overflow-hidden border border-[#E4E4E7] hover:border-[#141413] active:border-[#141413] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#141413]"
                  >
                    <div
                      className="h-11 px-2.5 flex items-end justify-between pb-1.5"
                      style={{ backgroundColor: hex, color: textColor }}
                    >
                      <span className="font-mono-tabular text-[11px] font-medium">
                        {hex}
                      </span>
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <Copy
                          className="w-3 h-3 opacity-65 sm:opacity-0 sm:group-hover:opacity-80 transition-opacity"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="px-2.5 py-2 bg-white">
                      <span className="block text-xs font-medium text-[#141413] truncate">
                        {swatch.name}
                      </span>
                      <span className="block text-[11px] text-[#787772]">
                        {isCopied ? 'Copied' : swatch.role}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
