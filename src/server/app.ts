import express from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  deleteSavedOutfitSql,
  listSavedOutfitsSql,
  listVoiceSessionsSql,
  listWardrobeAnalysesSql,
  recordVoiceSessionSql,
  recordWardrobeAnalysisSql,
  upsertSavedOutfitSql,
} from '../db/wardrobe.ts';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';

export function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function getLiveAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: 'v1beta',
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseImageDataUrl(dataUrl: unknown): { mimeType: string; data: string } | null {
  if (typeof dataUrl !== 'string') return null;
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(
    dataUrl.trim(),
  );
  if (!match) return null;
  const rawMime = match[1].toLowerCase();
  return {
    mimeType: rawMime === 'image/jpg' ? 'image/jpeg' : rawMime,
    data: match[2],
  };
}

export function classifyGeminiError(err: unknown): {
  status: number;
  message: string;
  requiresPaidKey: boolean;
} {
  const rawMessage = err instanceof Error ? err.message : String(err ?? 'Unknown error');
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('resource_exhausted') ||
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('billing') ||
    lower.includes('paid')
  ) {
    return {
      status: 429,
      requiresPaidKey: true,
      message:
        'Image generation with gemini-nano-banana-2.1 requires a billing-enabled Gemini API key in Settings > Secrets (quota exceeded on current tier).',
    };
  }

  if (
    lower.includes('permission_denied') ||
    lower.includes('403') ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid')
  ) {
    return {
      status: 403,
      requiresPaidKey: true,
      message:
        'Please check or select a valid Gemini API key in Settings > Secrets to run this model.',
    };
  }

  if (lower.includes('404') || lower.includes('not_found')) {
    return {
      status: 404,
      requiresPaidKey: false,
      message: 'Requested Gemini model is unavailable. Please try again shortly.',
    };
  }

  return {
    status: 500,
    requiresPaidKey: false,
    message: rawMessage || 'Failed to complete Gemini request.',
  };
}

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    itemAnalysis: {
      type: Type.OBJECT,
      properties: {
        itemName: { type: Type.STRING },
        category: { type: Type.STRING },
        silhouette: { type: Type.STRING },
        fabricAndTexture: { type: Type.STRING },
        patternDescription: { type: Type.STRING },
        stylePersonality: { type: Type.STRING },
        stylingStrategy: { type: Type.STRING },
        palette: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              hex: { type: Type.STRING },
              role: { type: Type.STRING },
            },
            required: ['name', 'hex', 'role'],
          },
        },
      },
      required: [
        'itemName',
        'category',
        'silhouette',
        'fabricAndTexture',
        'patternDescription',
        'stylePersonality',
        'stylingStrategy',
        'palette',
      ],
    },
    outfits: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          occasion: { type: Type.STRING },
          title: { type: Type.STRING },
          moodSummary: { type: Type.STRING },
          colorHarmonyNote: { type: Type.STRING },
          colorPaletteCategory: { type: Type.STRING },
          flatLayPrompt: { type: Type.STRING },
          pieces: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                slot: { type: Type.STRING },
                name: { type: Type.STRING },
                colorName: { type: Type.STRING },
                colorHex: { type: Type.STRING },
                material: { type: Type.STRING },
                stylingTip: { type: Type.STRING },
              },
              required: ['slot', 'name', 'colorName', 'colorHex', 'material', 'stylingTip'],
            },
          },
        },
        required: [
          'occasion',
          'title',
          'moodSummary',
          'colorHarmonyNote',
          'colorPaletteCategory',
          'flatLayPrompt',
          'pieces',
        ],
      },
    },
  },
  required: ['itemAnalysis', 'outfits'],
};

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/style/analyze', async (req, res) => {
    const parsedImage = parseImageDataUrl(req.body?.imageDataUrl);
    if (!parsedImage) {
      res.status(400).json({
        error: 'Please upload a valid PNG, JPEG, or WebP garment image.',
      });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in environment variables.',
        requiresPaidKey: false,
      });
      return;
    }

    const season =
      typeof req.body?.season === 'string' && req.body.season.trim()
        ? req.body.season.trim()
        : 'All-Season';
    const aesthetic =
      typeof req.body?.aesthetic === 'string' && req.body.aesthetic.trim()
        ? req.body.aesthetic.trim()
        : 'Modern Editorial';

    try {
      const prompt = [
        'You are a senior luxury fashion stylist and color theorist.',
        'Analyze the uploaded clothing or accessory item in the image carefully—identifying its exact garment type, cut/silhouette, textile texture, pattern details, and 4 to 5 accurate hex colors from the actual garment.',
        `Then design exactly 3 complete, genuinely distinct outfits featuring this exact uploaded item as the centerpiece for three occasions in order: "Casual", "Business", and "Night Out".`,
        `Context preferences from the client: Season = ${season}, Preferred Aesthetic = ${aesthetic}.`,
        'Rules:',
        '- Each outfit must include 4 complementary pieces (e.g. Top/Layer, Outerwear or Knit, Footwear, Bag/Accessory—never duplicate the anchor garment itself in the companion pieces list unless layering over/under a dress/top).',
        '- Assign each outfit a colorPaletteCategory from exactly one of: "Monochromatic", "Complementary", "Neutral Tones", or "Analogous", aiming for varied color strategies across the 3 occasions.',
        '- Provide exact hex codes (#RRGGBB) for both the item palette (role must be one of Primary, Secondary, Accent, Neutral) and every companion piece.',
        '- Write a vivid, concrete flatLayPrompt for each outfit describing an overhead knolling flat-lay photograph on seamless light alabaster studio paper (#F8F8F7), with soft diffused daylight, crisp fabric textures, no mannequins, and no models.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: parsedImage.mimeType,
                data: parsedImage.data,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          systemInstruction:
            'Return precise, stylish, wearable outfit guidance grounded in color harmony and textile contrast. Never include markdown outside JSON.',
          responseMimeType: 'application/json',
          responseSchema: ANALYSIS_SCHEMA,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        res.status(502).json({ error: 'Stylist analysis returned an empty response.' });
        return;
      }

      const data = JSON.parse(rawText);
      res.json(data);
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        error: classified.message,
        requiresPaidKey: classified.requiresPaidKey,
      });
    }
  });

  app.post('/api/style/flatlay', async (req, res) => {
    const prompt =
      typeof req.body?.flatLayPrompt === 'string' ? req.body.flatLayPrompt.trim() : '';
    if (prompt.length < 10) {
      res.status(400).json({ error: 'A detailed flat-lay description is required.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in environment variables.',
        requiresPaidKey: true,
      });
      return;
    }

    const parsedAnchor = req.body?.imageDataUrl
      ? parseImageDataUrl(req.body.imageDataUrl)
      : null;

    const aspectRatio = ['1:1', '3:4', '4:3', '9:16', '16:9'].includes(req.body?.aspectRatio)
      ? req.body.aspectRatio
      : '3:4';
    const imageSize = ['1K', '2K', '4K'].includes(req.body?.imageSize)
      ? req.body.imageSize
      : '1K';

    try {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (parsedAnchor) {
        parts.push({
          inlineData: {
            mimeType: parsedAnchor.mimeType,
            data: parsedAnchor.data,
          },
        });
      }
      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      let imageUrl: string | null = null;
      let modelNote = '';
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          modelNote += part.text;
        }
      }

      if (!imageUrl) {
        res.status(502).json({
          error: modelNote || 'Model completed without returning an image.',
        });
        return;
      }

      res.json({ imageUrl, modelNote });
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        error: classified.message,
        requiresPaidKey: classified.requiresPaidKey,
      });
    }
  });

  app.post('/api/style/create-or-edit-image', async (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (prompt.length < 3) {
      res.status(400).json({
        error: 'Please enter a prompt of at least 3 characters.',
      });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in environment variables.',
        requiresPaidKey: true,
      });
      return;
    }

    const parsedSource = req.body?.sourceImageDataUrl
      ? parseImageDataUrl(req.body.sourceImageDataUrl)
      : null;

    const aspectRatio = ['1:1', '3:4', '4:3', '9:16', '16:9'].includes(req.body?.aspectRatio)
      ? req.body.aspectRatio
      : '3:4';
    const imageSize = ['1K', '2K', '4K'].includes(req.body?.imageSize)
      ? req.body.imageSize
      : '1K';

    try {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (parsedSource) {
        parts.push({
          inlineData: {
            mimeType: parsedSource.mimeType,
            data: parsedSource.data,
          },
        });
        parts.push({
          text: `Edit this fashion flat-lay or garment image while keeping the remaining garments, overhead flat-lay perspective, and seamless light alabaster studio backdrop consistent. Requested edit: ${prompt}`,
        });
      } else {
        parts.push({
          text: `Clean overhead editorial fashion studio flat-lay photography on seamless light alabaster paper (#F8F8F7), soft diffused studio lighting, crisp fabric textures, no mannequins or models. Subject: ${prompt}`,
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      let imageUrl: string | null = null;
      let modelNote = '';
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          modelNote += part.text;
        }
      }

      if (!imageUrl) {
        res.status(502).json({
          error: modelNote || 'Image generation returned no visual output.',
        });
        return;
      }

      res.json({ imageUrl, modelNote });
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        error: classified.message,
        requiresPaidKey: classified.requiresPaidKey,
      });
    }
  });

  app.post('/api/wardrobe/sync-user', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.json({ user: req.dbUser });
  });

  app.get('/api/wardrobe/history', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      const [analyses, savedLooks, voiceSessions] = await Promise.all([
        listWardrobeAnalysesSql(req.dbUser.id),
        listSavedOutfitsSql(req.dbUser.id),
        listVoiceSessionsSql(req.dbUser.id),
      ]);
      res.json({ analyses, savedLooks, voiceSessions });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load wardrobe history.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/wardrobe/analyses', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const analysis = req.body?.analysis;
    if (!analysis || typeof analysis.itemName !== 'string') {
      res.status(400).json({ error: 'Invalid wardrobe analysis payload.' });
      return;
    }
    try {
      const created = await recordWardrobeAnalysisSql({
        userId: req.dbUser.id,
        itemName: String(analysis.itemName).slice(0, 140),
        category: String(analysis.category ?? 'Apparel').slice(0, 80),
        season: String(req.body?.season ?? 'All-Season').slice(0, 64),
        aesthetic: String(req.body?.aesthetic ?? 'Modern Editorial').slice(0, 64),
        stylePersonality: String(analysis.stylePersonality ?? 'Editorial').slice(0, 120),
        stylingStrategy: String(analysis.stylingStrategy ?? '').slice(0, 600),
        analysisJson: {
          itemAnalysis: analysis,
          outfits: Array.isArray(req.body?.outfits) ? req.body.outfits : [],
        },
      });
      res.status(201).json({ analysis: created });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to save wardrobe analysis.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/wardrobe/saved', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const look = req.body?.look;
    if (!look || typeof look.id !== 'string' || !look.outfit) {
      res.status(400).json({ error: 'Invalid saved look payload.' });
      return;
    }
    try {
      const saved = await upsertSavedOutfitSql({
        userId: req.dbUser.id,
        clientLookId: String(look.id).slice(0, 128),
        anchorItemName: String(look.anchorItemName ?? 'Anchor Piece').slice(0, 140),
        occasion: String(look.outfit.occasion ?? 'Casual').slice(0, 32),
        title: String(look.outfit.title ?? 'Styled Outfit').slice(0, 140),
        colorPaletteCategory:
          typeof look.outfit.colorPaletteCategory === 'string'
            ? look.outfit.colorPaletteCategory.slice(0, 48)
            : null,
        moodSummary: String(look.outfit.moodSummary ?? '').slice(0, 400),
        colorHarmonyNote: String(look.outfit.colorHarmonyNote ?? '').slice(0, 500),
        anchorImageRef:
          typeof look.anchorImageUrl === 'string' &&
          !look.anchorImageUrl.startsWith('data:')
            ? look.anchorImageUrl.slice(0, 500)
            : null,
        outfitJson: look.outfit,
        paletteJson: Array.isArray(look.palette) ? look.palette : [],
      });
      res.status(201).json({ saved });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to save outfit to database.';
      res.status(500).json({ error: message });
    }
  });

  app.delete(
    '/api/wardrobe/saved/:clientLookId',
    requireAuth,
    async (req: AuthRequest, res) => {
      if (!req.dbUser) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const rawParam = req.params.clientLookId;
      const clientLookId = (Array.isArray(rawParam) ? rawParam[0] : rawParam || '').trim();
      if (!clientLookId) {
        res.status(400).json({ error: 'Look ID is required.' });
        return;
      }
      try {
        await deleteSavedOutfitSql(req.dbUser.id, clientLookId);
        res.json({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to remove saved outfit.';
        res.status(500).json({ error: message });
      }
    },
  );

  app.post('/api/wardrobe/voice-sessions', requireAuth, async (req: AuthRequest, res) => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const anchorItemName =
      typeof req.body?.anchorItemName === 'string'
        ? req.body.anchorItemName.trim().slice(0, 140)
        : 'Wardrobe Consultation';
    const voiceName =
      typeof req.body?.voiceName === 'string'
        ? req.body.voiceName.trim().slice(0, 32)
        : 'Zephyr';
    const transcriptSummary =
      typeof req.body?.transcriptSummary === 'string'
        ? req.body.transcriptSummary.trim().slice(0, 2000)
        : null;
    const durationSeconds = Number(req.body?.durationSeconds) || 0;

    try {
      const recorded = await recordVoiceSessionSql({
        userId: req.dbUser.id,
        anchorItemName,
        voiceName,
        transcriptSummary,
        durationSeconds,
      });
      res.status(201).json({ session: recorded });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to record voice session.';
      res.status(500).json({ error: message });
    }
  });

  return app;
}
