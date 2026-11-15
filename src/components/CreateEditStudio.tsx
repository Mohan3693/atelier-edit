import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Download, ImagePlus, RefreshCw, Wand2 } from 'lucide-react';
import type { OutfitOption } from '../types/stylist';
import { createOrEditImageApi, fileToResizedDataUrl, urlToDataUrl } from '../utils/api';
import { validateEditPrompt } from '../utils/stylist';

interface CreateEditStudioProps {
  currentOutfits: OutfitOption[];
}

const STARTER_PROMPTS = [
  'Create an overhead flat-lay of a camel cashmere trench coat, cream silk blouse, wide-leg espresso trousers, leather ankle boots, and tortoiseshell sunglasses on alabaster stone',
  'Edit the flat-lay to swap the shoes for burgundy patent leather Mary Janes and add a structured mini ivory top-handle bag',
  'Create an editorial flat-lay of a dusty rose pleated midi skirt styled with a charcoal knit sweater and brushed silver accessories',
];

export function CreateEditStudio({ currentOutfits }: CreateEditStudioProps) {
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'3:4' | '1:1' | '4:3'>('3:4');
  const [imageSize, setImageSize] = useState<'1K' | '2K'>('1K');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [sourceLabel, setSourceLabel] = useState<string>('None selected');
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [resultNote, setResultNote] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const editFileRef = useRef<HTMLInputElement | null>(null);

  const readyOutfits = currentOutfits.filter((o) => Boolean(o.flatLayImageUrl));

  const handleSourceUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setSourceUrl(dataUrl);
      setSourceLabel(file.name);
      setMode('edit');
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load image.');
    }
    e.target.value = '';
  };

  const handleGenerate = async () => {
    const check = validateEditPrompt(prompt);
    if (!check.valid) {
      setErrorMsg(check.error || 'Please enter a valid prompt.');
      return;
    }

    if (mode === 'edit' && !sourceUrl) {
      setErrorMsg('Select an existing flat-lay or upload an image to edit.');
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);

    try {
      const sourceDataUrl =
        mode === 'edit' && sourceUrl ? await urlToDataUrl(sourceUrl) : undefined;

      const res = await createOrEditImageApi({
        prompt: check.cleaned,
        sourceImageDataUrl: sourceDataUrl,
        aspectRatio,
        imageSize,
      });

      setResultImageUrl(res.imageUrl);
      setResultNote(res.modelNote || '');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to complete image generation.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section
      id="create-edit"
      aria-label="Prompt-based flat-lay creation and image editing studio"
      className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 sm:py-12 border-b border-[#E4E4E7]"
    >
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between gap-5 sm:gap-6">
            <div className="space-y-3">
              <p className="text-xs font-medium text-[#575652]">
                Bespoke Flat-Lay Generator · gemini-nano-banana-2.1
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#141413] tracking-tight">
                Create or Edit Custom Flat-Lays
              </h2>
              <p className="text-sm text-[#575652] leading-relaxed max-w-xl">
                Describe a brand-new outfit concept from scratch, or select any generated flat-lay
                and modify individual garments, textures, or footwear with a natural-language
                prompt.
              </p>
            </div>

            <div className="space-y-4">
              <div
                role="tablist"
                aria-label="Image studio mode"
                className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex p-1 bg-[#EFEFEF] rounded-lg gap-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'create'}
                  onClick={() => {
                    setMode('create');
                    setErrorMsg(null);
                  }}
                  className={`min-h-11 sm:min-h-9 px-3 sm:px-4 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mode === 'create'
                      ? 'bg-white text-[#141413] shadow-xs'
                      : 'text-[#575652] hover:text-[#141413]'
                  }`}
                >
                  Create from Prompt
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'edit'}
                  onClick={() => {
                    setMode('edit');
                    setErrorMsg(null);
                    if (!sourceUrl && readyOutfits[0]?.flatLayImageUrl) {
                      setSourceUrl(readyOutfits[0].flatLayImageUrl);
                      setSourceLabel(`${readyOutfits[0].occasion} Look`);
                    }
                  }}
                  className={`min-h-11 sm:min-h-9 px-3 sm:px-4 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mode === 'edit'
                      ? 'bg-white text-[#141413] shadow-xs'
                      : 'text-[#575652] hover:text-[#141413]'
                  }`}
                >
                  Edit Existing Image
                </button>
              </div>

              {mode === 'edit' && (
                <div className="p-4 rounded-xl bg-[#F8F8F7] border border-[#E4E4E7] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#141413]">
                      Source Image: <span className="text-[#575652]">{sourceLabel}</span>
                    </span>
                    <div>
                      <input
                        ref={editFileRef}
                        id="studio-edit-file"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleSourceUpload}
                        className="sr-only"
                      />
                      <button
                        type="button"
                        onClick={() => editFileRef.current?.click()}
                        className="inline-flex items-center gap-1.5 min-h-10 sm:min-h-8 px-3 py-2 sm:py-1.5 text-xs font-medium bg-white border border-[#E4E4E7] rounded-lg hover:border-[#141413] cursor-pointer"
                      >
                        <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                        Upload Image
                      </button>
                    </div>
                  </div>

                  {readyOutfits.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {readyOutfits.map((outfit) => {
                        const selected = sourceUrl === outfit.flatLayImageUrl;
                        return (
                          <button
                            key={outfit.id}
                            type="button"
                            onClick={() => {
                              setSourceUrl(outfit.flatLayImageUrl!);
                              setSourceLabel(`${outfit.occasion} · ${outfit.title}`);
                            }}
                            className={`flex items-center gap-2 min-h-10 sm:min-h-8 px-3 sm:px-2.5 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                              selected
                                ? 'bg-white border-[#141413] font-semibold text-[#141413]'
                                : 'bg-white/70 border-[#E4E4E7] text-[#575652] hover:border-[#141413]'
                            }`}
                          >
                            <img
                              src={outfit.flatLayImageUrl!}
                              alt={outfit.title}
                              referrerPolicy="no-referrer"
                              className="w-6 h-6 rounded object-cover"
                            />
                            <span>{outfit.occasion}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor="studio-prompt-input"
                  className="block text-xs font-medium text-[#575652] mb-1.5"
                >
                  {mode === 'create'
                    ? 'Describe the flat-lay outfit or garment scene to create'
                    : 'Describe the edit to apply to the selected image'}
                </label>
                <textarea
                  id="studio-prompt-input"
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === 'create'
                      ? 'Overhead studio flat-lay of an olive linen suit paired with a white silk shell, woven leather mules, and brass hoop earrings...'
                      : 'Swap the sneakers for espresso suede ankle boots and replace the denim jacket with a camel wool coat...'
                  }
                  className="w-full p-3.5 sm:p-3 text-base sm:text-sm bg-white border border-[#E4E4E7] rounded-xl text-[#141413] placeholder:text-[#8E8D88] focus-visible:outline-2 focus-visible:outline-[#141413]"
                />
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {STARTER_PROMPTS.map((example, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(example);
                        if (idx === 1 && readyOutfits[0]?.flatLayImageUrl) {
                          setMode('edit');
                          setSourceUrl(readyOutfits[0].flatLayImageUrl);
                          setSourceLabel(`${readyOutfits[0].occasion} Look`);
                        }
                      }}
                      className="text-xs sm:text-[11px] min-h-10 sm:min-h-0 px-3 sm:px-2.5 py-2 sm:py-1 rounded-lg sm:rounded-md bg-[#F8F8F7] border border-[#E4E4E7] text-[#575652] hover:text-[#141413] hover:border-[#141413] transition-colors cursor-pointer"
                    >
                      Try prompt {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label
                    htmlFor="studio-aspect-select"
                    className="block text-xs font-medium text-[#575652] mb-1.5"
                  >
                    Aspect Ratio
                  </label>
                  <select
                    id="studio-aspect-select"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as '3:4' | '1:1' | '4:3')}
                    className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-white border border-[#E4E4E7] rounded-lg text-[#141413]"
                  >
                    <option value="3:4">3:4 Editorial Portrait</option>
                    <option value="1:1">1:1 Square Studio</option>
                    <option value="4:3">4:3 Landscape Spread</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="studio-resolution-select"
                    className="block text-xs font-medium text-[#575652] mb-1.5"
                  >
                    Output Resolution
                  </label>
                  <select
                    id="studio-resolution-select"
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value as '1K' | '2K')}
                    className="w-full h-11 sm:h-10 px-3 text-base sm:text-sm bg-white border border-[#E4E4E7] rounded-lg text-[#141413]"
                  >
                    <option value="1K">1K Studio Standard</option>
                    <option value="2K">2K High Detail</option>
                  </select>
                </div>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg bg-[#FDF2F4] border border-[#F3C5CE] text-xs text-[#881327]"
                >
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleGenerate}
                  className="w-full sm:w-auto min-h-12 sm:min-h-11 inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 text-sm font-semibold text-white bg-[#141413] rounded-lg hover:bg-[#2C2C2A] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Rendering with Nano Banana 2.1...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" aria-hidden="true" />
                      {mode === 'create' ? 'Create Flat-Lay Image' : 'Apply Image Edit'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col pt-4 border-t border-[#EFEFEF] lg:pt-0 lg:border-t-0 lg:border-l lg:border-[#EFEFEF] lg:pl-8">
            <div className="flex-1 flex flex-col justify-between min-h-[260px] sm:min-h-[340px]">
              <div className="flex items-center justify-between text-xs text-[#575652] pb-3 border-b border-[#EFEFEF]">
                <span>Studio Output Canvas</span>
                <span className="font-mono-tabular">
                  {aspectRatio} · {imageSize}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center my-4 overflow-hidden rounded-xl bg-[#F8F8F7]">
                {resultImageUrl ? (
                  <img
                    src={resultImageUrl}
                    alt="Generated or edited flat-lay studio image"
                    referrerPolicy="no-referrer"
                    className="w-full h-full max-h-[380px] object-contain"
                  />
                ) : mode === 'edit' && sourceUrl ? (
                  <img
                    src={sourceUrl}
                    alt="Selected source flat-lay preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full max-h-[380px] object-contain opacity-90"
                  />
                ) : (
                  <div className="p-8 text-center">
                    <p className="font-display text-xl text-[#141413]">
                      Ready for Your Direction
                    </p>
                    <p className="text-xs text-[#575652] mt-1 max-w-xs mx-auto">
                      Your generated or prompt-edited flat-lay image will render here.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#EFEFEF] flex items-center justify-between gap-2 text-xs">
                <span className="text-[#575652] truncate">
                  {resultNote || (resultImageUrl ? 'Rendered via gemini-nano-banana-2.1' : 'Awaiting prompt')}
                </span>
                {resultImageUrl && (
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSourceUrl(resultImageUrl);
                        setSourceLabel('Latest Studio Render');
                        setMode('edit');
                      }}
                      className="font-medium text-[#141413] hover:underline cursor-pointer"
                    >
                      Edit Further
                    </button>
                    <a
                      href={resultImageUrl}
                      download="atelier-edit-flatlay.png"
                      className="inline-flex items-center gap-1 font-semibold text-[#9E1B32] hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      Download
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
