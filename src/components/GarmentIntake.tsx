import { useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Upload, RefreshCw, Sparkles } from 'lucide-react';
import type { SampleGarment } from '../types/stylist';
import { SAMPLE_WARDROBE } from '../data/sampleWardrobe';

interface GarmentIntakeProps {
  selectedImageUrl: string;
  selectedImageLabel: string;
  isSamplePrecomputed: boolean;
  season: string;
  aesthetic: string;
  isAnalyzing: boolean;
  intakeError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSeasonChange: (season: string) => void;
  onAestheticChange: (aesthetic: string) => void;
  onFileSelected: (file: File) => void;
  onSelectSample: (sample: SampleGarment) => void;
  onGenerateLooks: () => void;
}

export function GarmentIntake({
  selectedImageUrl,
  selectedImageLabel,
  isSamplePrecomputed,
  season,
  aesthetic,
  isAnalyzing,
  intakeError,
  fileInputRef,
  onSeasonChange,
  onAestheticChange,
  onFileSelected,
  onSelectSample,
  onGenerateLooks,
}: GarmentIntakeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewFailed(false);
      onFileSelected(file);
    }
    e.target.value = '';
  };

  return (
    <section
      id="style-studio"
      className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-6 pb-10 sm:pt-10 sm:pb-14 border-b border-[#E4E4E7]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between gap-6 sm:gap-8">
          <div className="space-y-3 sm:space-y-4">
            <p className="text-xs font-medium tracking-wide text-[#575652]">
              Virtual Stylist · Color &amp; Silhouette Engine
            </p>
            <h1 className="font-display text-[clamp(2rem,8.2vw,3.75rem)] font-semibold leading-[1.06] tracking-tight text-[#141413] text-balance max-w-2xl">
              One challenging piece. Three complete outfits.
            </h1>
            <p className="text-[15px] leading-relaxed text-[#575652] max-w-xl">
              Upload a photo of a hard-to-style skirt, jacket, or statement piece. Atelier Edit
              maps its exact color palette and textile character, then composes Casual, Business,
              and Night Out flat-lay looks.
            </p>
          </div>

          <div className="space-y-5">
            <input
              ref={fileInputRef}
              id="garment-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
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
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  setPreviewFailed(false);
                  onFileSelected(file);
                }
              }}
              className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border border-dashed transition-colors ${
                isDragging
                  ? 'border-[#9E1B32] bg-white'
                  : 'border-[#C8C7C2] bg-white hover:border-[#141413]'
              }`}
            >
              <div className="flex items-center gap-3.5 sm:gap-4">
                <span className="w-11 h-11 rounded-lg bg-[#EFEFEF] flex items-center justify-center text-[#141413] shrink-0">
                  <Upload className="w-5 h-5" aria-hidden="true" />
                </span>
                <div>
                  <span className="block text-sm font-semibold text-[#141413]">
                    Upload garment photo
                  </span>
                  <span className="block text-xs text-[#575652] mt-0.5">
                    Tap to choose or drag PNG, JPEG, or WebP
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto min-h-11 px-4 py-2.5 text-xs font-medium text-[#141413] bg-[#F8F8F7] border border-[#E4E4E7] rounded-lg hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#141413]"
              >
                Choose File
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
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
                  className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-white border border-[#E4E4E7] rounded-lg text-[#141413] focus-visible:outline-2 focus-visible:outline-[#141413]"
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
                  className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-white border border-[#E4E4E7] rounded-lg text-[#141413] focus-visible:outline-2 focus-visible:outline-[#141413]"
                >
                  <option value="Modern Editorial">Modern Editorial</option>
                  <option value="Minimalist Classic">Minimalist Classic</option>
                  <option value="Relaxed Architectural">Relaxed Architectural</option>
                  <option value="Bold High-Contrast">Bold High-Contrast</option>
                </select>
              </div>
            </div>

            {intakeError && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-[#FDF2F4] border border-[#F3C5CE] text-xs text-[#881327]"
              >
                {intakeError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={onGenerateLooks}
                disabled={isAnalyzing || !selectedImageUrl}
                className="w-full sm:w-auto min-h-12 sm:min-h-11 inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#9E1B32] rounded-lg hover:bg-[#821529] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9E1B32]"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Analyzing &amp; Styling...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    {isSamplePrecomputed
                      ? 'Re-Analyze & Generate New Looks'
                      : 'Generate 3 Styled Looks'}
                  </>
                )}
              </button>
              <span className="text-xs text-[#575652] truncate">
                Selected: <strong className="font-medium text-[#141413]">{selectedImageLabel}</strong>
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#EFEFEF]">
            <p className="text-xs font-medium text-[#575652] mb-2.5 sm:mb-3">
              Or test with a curated hard-to-style sample piece
            </p>
            <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto sm:overflow-visible no-scrollbar snap-x snap-mandatory pb-1 sm:pb-0">
              {SAMPLE_WARDROBE.map((sample) => {
                const isActive = selectedImageUrl === sample.imageUrl;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      setPreviewFailed(false);
                      onSelectSample(sample);
                    }}
                    className={`min-w-[235px] sm:min-w-0 snap-start min-h-[62px] text-left p-3 sm:p-2.5 rounded-xl border transition-colors flex items-center gap-3 cursor-pointer shrink-0 sm:shrink focus-visible:outline-2 focus-visible:outline-[#141413] ${
                      isActive
                        ? 'bg-white border-[#141413]'
                        : 'bg-[#EFEFEF]/60 border-transparent hover:bg-white hover:border-[#D4D4D8]'
                    }`}
                  >
                    <img
                      src={sample.imageUrl}
                      alt={sample.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover bg-[#F8F8F7] shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold text-[#141413] truncate">
                        {sample.name}
                      </span>
                      <span className="block text-[11px] text-[#575652] truncate mt-0.5">
                        {sample.category}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex">
          <div className="w-full bg-white border border-[#E4E4E7] rounded-2xl overflow-hidden flex flex-col justify-between">
            <div className="px-4 sm:px-5 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 border-b border-[#EFEFEF]">
              <span className="text-xs font-medium text-[#575652]">
                Anchor Garment Studio Frame
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-10 sm:min-h-0 px-2 -mr-2 text-xs font-medium text-[#141413] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center"
              >
                Replace Photo
              </button>
            </div>

            <div className="flex-1 min-h-[240px] sm:min-h-[320px] lg:min-h-[380px] bg-[#EEEDE6] overflow-hidden flex items-center justify-center">
              {selectedImageUrl && !previewFailed ? (
                <img
                  src={selectedImageUrl}
                  alt={selectedImageLabel}
                  referrerPolicy="no-referrer"
                  onError={() => setPreviewFailed(true)}
                  className="w-full h-full max-h-[340px] sm:max-h-[460px] object-cover"
                />
              ) : (
                <div className="p-8 text-center">
                  <p className="font-display text-xl text-[#141413]">
                    {selectedImageLabel || 'No piece selected'}
                  </p>
                  <p className="text-xs text-[#575652] mt-1">
                    Upload a garment image to preview it on studio paper
                  </p>
                </div>
              )}
            </div>

            <div className="px-4 sm:px-5 py-3 border-t border-[#EFEFEF] flex items-center justify-between gap-3 text-xs text-[#575652]">
              <span className="truncate font-medium text-[#141413]">{selectedImageLabel}</span>
              <span className="whitespace-nowrap shrink-0">
                {isSamplePrecomputed ? 'Instant Lookbook Ready' : 'Ready for AI Analysis'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
