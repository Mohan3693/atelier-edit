import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { GarmentIntake } from './components/GarmentIntake';
import { AnalysisStrip } from './components/AnalysisStrip';
import { OutfitGrid } from './components/OutfitGrid';
import { CreateEditStudio } from './components/CreateEditStudio';
import { VoiceStylistSection } from './components/VoiceStylistSection';
import {
  SavedLooksSection,
  type HistoryAnalysisEntry,
} from './components/SavedLooksSection';
import { LookLightboxModal } from './components/LookLightboxModal';
import { useAuth } from './contexts/AuthContext';
import { SAMPLE_WARDROBE } from './data/sampleWardrobe';
import {
  deleteSavedLookInFirestore,
  loadUserPreferencesFromFirestore,
  recordAnalysisInFirestore,
  saveUserPreferencesToFirestore,
  subscribeSavedLooksInFirestore,
  syncUserProfileToFirestore,
  upsertSavedLookInFirestore,
} from './lib/firestoreLooks';
import type {
  ItemAnalysis,
  OccasionType,
  OutfitOption,
  SampleGarment,
  SavedLook,
} from './types/stylist';
import {
  analyzeGarmentApi,
  createOrEditImageApi,
  deleteSavedLookSqlApi,
  fetchWardrobeHistorySqlApi,
  fileToResizedDataUrl,
  generateFlatLayApi,
  recordAnalysisSqlApi,
  recordVoiceSessionSqlApi,
  syncUserSqlApi,
  upsertSavedLookSqlApi,
  urlToDataUrl,
} from './utils/api';
import type { StylistVoiceName } from './utils/liveAudio';
import {
  buildFlatLayPrompt,
  getOutfitPaletteCategory,
  parseSavedLooksJson,
  SAVED_LOOKS_STORAGE_KEY,
  toggleSavedOutfit,
} from './utils/stylist';
import { exportOutfitsToPdf } from './utils/pdfExport';

const FLAGSHIP_SAMPLE = SAMPLE_WARDROBE[0];

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    user,
    loading: authLoading,
    authError,
    clearAuthError,
    signInWithGoogle,
    signOutUser,
    getIdToken,
  } = useAuth();

  const [selectedImageUrl, setSelectedImageUrl] = useState<string>(FLAGSHIP_SAMPLE.imageUrl);
  const [selectedImageLabel, setSelectedImageLabel] = useState<string>(FLAGSHIP_SAMPLE.name);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(FLAGSHIP_SAMPLE.id);

  const [season, setSeason] = useState<string>('All-Season');
  const [aesthetic, setAesthetic] = useState<string>('Modern Editorial');
  const [preferredVoice, setPreferredVoice] = useState<StylistVoiceName>('Zephyr');

  const [analysis, setAnalysis] = useState<ItemAnalysis | null>(
    FLAGSHIP_SAMPLE.precomputedAnalysis ?? null,
  );
  const [analysisImageUrl, setAnalysisImageUrl] = useState<string>(FLAGSHIP_SAMPLE.imageUrl);
  const [outfits, setOutfits] = useState<OutfitOption[]>(
    FLAGSHIP_SAMPLE.precomputedOutfits ?? [],
  );

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<HistoryAnalysisEntry[]>([]);

  const [savedLooks, setSavedLooks] = useState<SavedLook[]>(() => {
    if (typeof window === 'undefined') return [];
    return parseSavedLooksJson(window.localStorage.getItem(SAVED_LOOKS_STORAGE_KEY));
  });

  const [lightboxState, setLightboxState] = useState<{
    outfit: OutfitOption;
    anchorItemName: string;
  } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_LOOKS_STORAGE_KEY, JSON.stringify(savedLooks));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedLooks]);

  useEffect(() => {
    if (!user) {
      setRecentAnalyses([]);
      return;
    }

    let cancelled = false;
    let unsubscribeLooks: (() => void) | null = null;

    const bootstrapUserData = async () => {
      try {
        await syncUserProfileToFirestore(user);
        const prefs = await loadUserPreferencesFromFirestore(user.uid);
        if (!cancelled && prefs) {
          setSeason(prefs.preferredSeason);
          setAesthetic(prefs.preferredAesthetic);
          setPreferredVoice(prefs.preferredVoice);
        }

        unsubscribeLooks = subscribeSavedLooksInFirestore(user.uid, () => {
          // Real-time Firestore listener active for verified owner
        });

        const token = await getIdToken();
        if (token && !cancelled) {
          await syncUserSqlApi(token);
          const history = await fetchWardrobeHistorySqlApi(token);
          if (cancelled) return;

          setRecentAnalyses(
            history.analyses.map((a) => ({
              id: a.id,
              itemName: a.itemName,
              category: a.category,
              season: a.season,
              aesthetic: a.aesthetic,
              stylePersonality: a.stylePersonality,
              createdAt: a.createdAt,
              itemAnalysis: a.analysisJson?.itemAnalysis,
              outfits: a.analysisJson?.outfits,
            })),
          );

          if (history.savedLooks.length > 0) {
            setSavedLooks((localPrev) => {
              const map = new Map<string, SavedLook>();
              for (const item of localPrev) {
                map.set(item.id, item);
              }
              for (const row of history.savedLooks) {
                if (row.outfitJson && !map.has(row.clientLookId)) {
                  map.set(row.clientLookId, {
                    id: row.clientLookId,
                    savedAt: row.createdAt,
                    anchorItemName: row.anchorItemName,
                    anchorImageUrl: row.anchorImageRef || FLAGSHIP_SAMPLE.imageUrl,
                    palette: Array.isArray(row.paletteJson) ? row.paletteJson : [],
                    outfit: row.outfitJson,
                  });
                }
              }
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        console.error('Account sync notice:', err);
      }
    };

    void bootstrapUserData();

    return () => {
      cancelled = true;
      unsubscribeLooks?.();
    };
  }, [user, getIdToken]);

  const persistUserPrefs = async (
    nextSeason: string,
    nextAesthetic: string,
    nextVoice: StylistVoiceName,
  ) => {
    if (!user) return;
    try {
      await saveUserPreferencesToFirestore(user.uid, {
        preferredSeason:
          nextSeason === 'Spring / Summer' || nextSeason === 'Autumn / Winter'
            ? nextSeason
            : 'All-Season',
        preferredAesthetic: nextAesthetic,
        preferredVoice: nextVoice,
      });
    } catch {
      // Non-blocking preference sync
    }
  };

  const handleNavigateSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (file: File) => {
    setIntakeError(null);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setSelectedImageUrl(dataUrl);
      setSelectedImageLabel(file.name);
      setActiveSampleId(null);
    } catch (err) {
      setIntakeError(
        err instanceof Error ? err.message : 'Unable to read the selected image.',
      );
    }
  };

  const handleSelectSample = (sample: SampleGarment) => {
    setIntakeError(null);
    setSelectedImageUrl(sample.imageUrl);
    setSelectedImageLabel(sample.name);
    setActiveSampleId(sample.id);

    if (sample.precomputedAnalysis && sample.precomputedOutfits) {
      setAnalysis(sample.precomputedAnalysis);
      setAnalysisImageUrl(sample.imageUrl);
      setOutfits(sample.precomputedOutfits);
    }
  };

  const generateFlatLayForOutfit = async (
    outfit: OutfitOption,
    anchorDataUrl: string,
    itemAnalysis: ItemAnalysis,
  ) => {
    setOutfits((prev) =>
      prev.map((o) =>
        o.id === outfit.id
          ? { ...o, flatLayStatus: 'loading', flatLayError: undefined }
          : o,
      ),
    );

    try {
      const prompt = buildFlatLayPrompt(itemAnalysis, outfit);
      const res = await generateFlatLayApi({
        imageDataUrl: anchorDataUrl,
        flatLayPrompt: prompt,
        occasion: outfit.occasion,
        aspectRatio: '3:4',
        imageSize: '1K',
      });

      setOutfits((prev) =>
        prev.map((o) =>
          o.id === outfit.id
            ? {
                ...o,
                flatLayImageUrl: res.imageUrl,
                flatLayStatus: 'ready',
                flatLayError: undefined,
              }
            : o,
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Flat-lay photo generation is unavailable right now.';
      setOutfits((prev) =>
        prev.map((o) =>
          o.id === outfit.id
            ? {
                ...o,
                flatLayStatus: 'error',
                flatLayError: message,
              }
            : o,
        ),
      );
    }
  };

  const runAnalysisForImage = async (targetImageUrl: string) => {
    setIntakeError(null);
    setIsAnalyzing(true);

    try {
      const anchorDataUrl = await urlToDataUrl(targetImageUrl);
      const analyzed = await analyzeGarmentApi({
        imageDataUrl: anchorDataUrl,
        season,
        aesthetic,
      });

      const batchStamp = Date.now();
      const normalizedOutfits: OutfitOption[] = analyzed.outfits.slice(0, 3).map((item, idx) => {
        const occasion: OccasionType =
          item.occasion === 'Business' || item.occasion === 'Night Out'
            ? item.occasion
            : idx === 1
              ? 'Business'
              : idx === 2
                ? 'Night Out'
                : 'Casual';
        return {
          ...item,
          occasion,
          colorPaletteCategory: getOutfitPaletteCategory(
            item,
            analyzed.itemAnalysis.palette,
          ),
          id: `look-${occasion.toLowerCase().replace(/\s+/g, '-')}-${batchStamp}-${idx}`,
          flatLayImageUrl: null,
          flatLayStatus: 'loading',
          editHistory: [],
        };
      });

      setAnalysis(analyzed.itemAnalysis);
      setAnalysisImageUrl(targetImageUrl);
      setOutfits(normalizedOutfits);
      setIsAnalyzing(false);

      if (user) {
        const analysisId = `analysis-${batchStamp}`;
        void recordAnalysisInFirestore(
          user.uid,
          analysisId,
          analyzed.itemAnalysis,
          season,
          aesthetic,
        ).catch(() => {});

        void getIdToken().then(async (token) => {
          if (!token) return;
          try {
            await recordAnalysisSqlApi(token, {
              analysis: analyzed.itemAnalysis,
              outfits: normalizedOutfits,
              season,
              aesthetic,
            });
            const history = await fetchWardrobeHistorySqlApi(token);
            setRecentAnalyses(
              history.analyses.map((a) => ({
                id: a.id,
                itemName: a.itemName,
                category: a.category,
                season: a.season,
                aesthetic: a.aesthetic,
                stylePersonality: a.stylePersonality,
                createdAt: a.createdAt,
                itemAnalysis: a.analysisJson?.itemAnalysis,
                outfits: a.analysisJson?.outfits,
              })),
            );
          } catch {
            // Non-blocking sync
          }
        });
      }

      setTimeout(() => {
        handleNavigateSection('outfit-looks');
      }, 120);

      await Promise.all(
        normalizedOutfits.map((outfit) =>
          generateFlatLayForOutfit(outfit, anchorDataUrl, analyzed.itemAnalysis),
        ),
      );
    } catch (err) {
      setIsAnalyzing(false);
      setIntakeError(
        err instanceof Error
          ? err.message
          : 'Could not analyze the uploaded garment. Please try again.',
      );
    }
  };

  const handleGenerateLooks = async () => {
    if (!selectedImageUrl) {
      setIntakeError('Please upload a garment photo or pick a sample item first.');
      return;
    }
    await runAnalysisForImage(selectedImageUrl);
  };

  const handleRefreshAllOutfits = async () => {
    const targetUrl = analysisImageUrl || selectedImageUrl;
    if (!targetUrl) return;
    await runAnalysisForImage(targetUrl);
  };

  const handleExportAllToPdf = async (
    visibleOutfits: OutfitOption[],
  ): Promise<{ ok: boolean; message: string }> => {
    if (!analysis || visibleOutfits.length === 0) {
      return { ok: false, message: 'No outfits available to export.' };
    }
    try {
      const result = await exportOutfitsToPdf({
        analysis,
        anchorImageUrl: analysisImageUrl,
        outfits: visibleOutfits,
      });
      return {
        ok: true,
        message: `Exported ${visibleOutfits.length} ${visibleOutfits.length === 1 ? 'look' : 'looks'} to ${result.filename}`,
      };
    } catch (err) {
      return {
        ok: false,
        message:
          err instanceof Error ? err.message : 'Unable to generate PDF lookbook.',
      };
    }
  };

  const handleRetryFlatLay = async (outfitId: string) => {
    const target = outfits.find((o) => o.id === outfitId);
    if (!target || !analysis) return;
    try {
      const anchorDataUrl = await urlToDataUrl(analysisImageUrl);
      await generateFlatLayForOutfit(target, anchorDataUrl, analysis);
    } catch (err) {
      setOutfits((prev) =>
        prev.map((o) =>
          o.id === outfitId
            ? {
                ...o,
                flatLayStatus: 'error',
                flatLayError:
                  err instanceof Error ? err.message : 'Unable to retry photo.',
              }
            : o,
        ),
      );
    }
  };

  const handleApplyPromptEdit = async (
    outfitId: string,
    prompt: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    const target = outfits.find((o) => o.id === outfitId);
    if (!target) return { ok: false, error: 'Outfit not found.' };

    setEditingOutfitId(outfitId);
    try {
      const sourceUrl = target.flatLayImageUrl || analysisImageUrl;
      const sourceDataUrl = sourceUrl ? await urlToDataUrl(sourceUrl) : undefined;
      const fullPrompt = target.flatLayImageUrl
        ? prompt
        : analysis
          ? buildFlatLayPrompt(analysis, target, prompt)
          : prompt;

      const res = await createOrEditImageApi({
        prompt: fullPrompt,
        sourceImageDataUrl: sourceDataUrl,
        aspectRatio: '3:4',
        imageSize: '1K',
      });

      setOutfits((prev) =>
        prev.map((o) =>
          o.id === outfitId
            ? {
                ...o,
                flatLayImageUrl: res.imageUrl,
                flatLayStatus: 'ready',
                flatLayError: undefined,
                editHistory: [...o.editHistory, prompt],
              }
            : o,
        ),
      );
      return { ok: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not apply flat-lay edit.';
      return { ok: false, error: message };
    } finally {
      setEditingOutfitId(null);
    }
  };

  const handleToggleSave = (outfit: OutfitOption) => {
    if (!analysis) return;
    const result = toggleSavedOutfit(savedLooks, {
      outfit,
      anchorItemName: analysis.itemName,
      anchorImageUrl: analysisImageUrl,
      palette: analysis.palette,
    });
    setSavedLooks(result.next);

    if (user) {
      if (result.saved) {
        const added = result.next[0];
        if (added) {
          void upsertSavedLookInFirestore(user.uid, added).catch(() => {});
          void getIdToken().then((token) => {
            if (token) void upsertSavedLookSqlApi(token, added).catch(() => {});
          });
        }
      } else {
        const removed = savedLooks.find((item) => item.outfit.id === outfit.id);
        if (removed) {
          void deleteSavedLookInFirestore(user.uid, removed.id).catch(() => {});
          void getIdToken().then((token) => {
            if (token) void deleteSavedLookSqlApi(token, removed.id).catch(() => {});
          });
        }
      }
    }
  };

  const handleRemoveSavedLook = (lookId: string) => {
    setSavedLooks((prev) => prev.filter((item) => item.id !== lookId));
    if (user) {
      void deleteSavedLookInFirestore(user.uid, lookId).catch(() => {});
      void getIdToken().then((token) => {
        if (token) void deleteSavedLookSqlApi(token, lookId).catch(() => {});
      });
    }
  };

  const handleRestoreAnalysis = (entry: HistoryAnalysisEntry) => {
    if (!entry.itemAnalysis || !entry.outfits) return;
    setAnalysis(entry.itemAnalysis);
    setOutfits(entry.outfits);
    handleNavigateSection('outfit-looks');
  };

  const handleVoiceSessionEnded = (summary: {
    anchorItemName: string;
    voiceName: StylistVoiceName;
    transcriptSummary: string;
    durationSeconds: number;
  }) => {
    if (!user) return;
    void getIdToken().then((token) => {
      if (token) {
        void recordVoiceSessionSqlApi(token, summary).catch(() => {});
      }
    });
  };

  const isSamplePrecomputed = Boolean(
    activeSampleId &&
      SAMPLE_WARDROBE.find((s) => s.id === activeSampleId)?.precomputedOutfits,
  );

  return (
    <div className="min-h-screen bg-[#F8F8F7] text-[#141413] flex flex-col">
      <Header
        savedCount={savedLooks.length}
        user={user}
        authLoading={authLoading}
        onSignInWithGoogle={signInWithGoogle}
        onSignOut={signOutUser}
        onTriggerUpload={handleTriggerUpload}
        onNavigateSection={handleNavigateSection}
      />

      {authError && (
        <div
          role="alert"
          className="bg-[#FAF3F4] border-b border-[#E7C6CC] px-4 sm:px-6 py-2.5 text-xs text-[#9E1B32] flex items-center justify-between gap-4 max-w-[1240px] w-full mx-auto"
        >
          <span>{authError}</span>
          <button
            type="button"
            onClick={clearAuthError}
            className="min-h-10 px-2 font-semibold underline cursor-pointer shrink-0 inline-flex items-center"
          >
            Dismiss
          </button>
        </div>
      )}

      <main className="flex-1">
        <nav
          aria-label="Mobile section links"
          className="lg:hidden border-b border-[#E4E4E7] bg-white px-3 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar text-xs font-medium text-[#575652]"
        >
          <button
            type="button"
            onClick={() => handleNavigateSection('style-studio')}
            className="min-h-11 px-3 py-2 rounded-lg whitespace-nowrap shrink-0 hover:text-[#141413] hover:bg-[#F8F8F7] active:bg-[#EFEFEF] transition-colors cursor-pointer"
          >
            Style Studio
          </button>
          <button
            type="button"
            onClick={() => handleNavigateSection('outfit-looks')}
            className="min-h-11 px-3 py-2 rounded-lg whitespace-nowrap shrink-0 hover:text-[#141413] hover:bg-[#F8F8F7] active:bg-[#EFEFEF] transition-colors cursor-pointer"
          >
            Styled Looks
          </button>
          <button
            type="button"
            onClick={() => handleNavigateSection('create-edit')}
            className="min-h-11 px-3 py-2 rounded-lg whitespace-nowrap shrink-0 hover:text-[#141413] hover:bg-[#F8F8F7] active:bg-[#EFEFEF] transition-colors cursor-pointer"
          >
            Create &amp; Edit
          </button>
          <button
            type="button"
            onClick={() => handleNavigateSection('voice-stylist')}
            className="min-h-11 px-3 py-2 rounded-lg whitespace-nowrap shrink-0 hover:text-[#141413] hover:bg-[#F8F8F7] active:bg-[#EFEFEF] transition-colors cursor-pointer"
          >
            Voice Stylist
          </button>
          <button
            type="button"
            onClick={() => handleNavigateSection('saved-looks')}
            className="min-h-11 px-3 py-2 rounded-lg whitespace-nowrap shrink-0 hover:text-[#141413] hover:bg-[#F8F8F7] active:bg-[#EFEFEF] transition-colors tabular-nums cursor-pointer"
          >
            {savedLooks.length > 0 ? `Saved (${savedLooks.length})` : 'Saved Looks'}
          </button>
        </nav>

        <GarmentIntake
          selectedImageUrl={selectedImageUrl}
          selectedImageLabel={selectedImageLabel}
          isSamplePrecomputed={isSamplePrecomputed}
          season={season}
          aesthetic={aesthetic}
          isAnalyzing={isAnalyzing}
          intakeError={intakeError}
          fileInputRef={fileInputRef}
          onSeasonChange={(nextSeason) => {
            setSeason(nextSeason);
            void persistUserPrefs(nextSeason, aesthetic, preferredVoice);
          }}
          onAestheticChange={(nextAesthetic) => {
            setAesthetic(nextAesthetic);
            void persistUserPrefs(season, nextAesthetic, preferredVoice);
          }}
          onFileSelected={handleFileSelected}
          onSelectSample={handleSelectSample}
          onGenerateLooks={handleGenerateLooks}
        />

        {analysis && (
          <AnalysisStrip analysis={analysis} anchorImageUrl={analysisImageUrl} />
        )}

        {outfits.length > 0 && analysis && (
          <OutfitGrid
            outfits={outfits}
            anchorPalette={analysis.palette}
            anchorImageUrl={analysisImageUrl}
            anchorItemName={analysis.itemName}
            savedLooks={savedLooks}
            editingOutfitId={editingOutfitId}
            isRefreshingAll={isAnalyzing}
            onRetryFlatLay={handleRetryFlatLay}
            onApplyPromptEdit={handleApplyPromptEdit}
            onToggleSave={handleToggleSave}
            onInspectLook={(outfit) =>
              setLightboxState({ outfit, anchorItemName: analysis.itemName })
            }
            onRefreshAllOutfits={handleRefreshAllOutfits}
            onExportAllToPdf={handleExportAllToPdf}
          />
        )}

        <CreateEditStudio currentOutfits={outfits} />

        <VoiceStylistSection
          analysis={analysis}
          outfits={outfits}
          preferredVoice={preferredVoice}
          onVoiceChange={(nextVoice) => {
            setPreferredVoice(nextVoice);
            void persistUserPrefs(season, aesthetic, nextVoice);
          }}
          onVoiceSessionEnded={handleVoiceSessionEnded}
        />

        <SavedLooksSection
          savedLooks={savedLooks}
          isSignedIn={Boolean(user)}
          recentAnalyses={recentAnalyses}
          onSignInPrompt={signInWithGoogle}
          onRestoreAnalysis={handleRestoreAnalysis}
          onRemoveSavedLook={handleRemoveSavedLook}
          onInspectSavedLook={(outfit, anchorItemName) =>
            setLightboxState({ outfit, anchorItemName })
          }
        />
      </main>

      <footer className="border-t border-[#E4E4E7] bg-white">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left text-xs text-[#575652]">
          <span className="font-display text-base font-semibold text-[#141413]">
            Atelier Edit
          </span>
          <span>
            Editorial Virtual Stylist · Casual, Business &amp; Night Out Flat-Lay Studio
          </span>
        </div>
      </footer>

      <LookLightboxModal
        outfit={lightboxState?.outfit ?? null}
        anchorItemName={lightboxState?.anchorItemName ?? ''}
        onClose={() => setLightboxState(null)}
      />
    </div>
  );
}
