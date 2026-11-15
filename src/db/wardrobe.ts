import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { savedOutfitsSql, wardrobeAnalyses } from './schema.ts';

export interface SaveOutfitSqlInput {
  userId: number;
  clientLookId: string;
  anchorItemName: string;
  occasion: string;
  title: string;
  colorPaletteCategory?: string | null;
  moodSummary: string;
  colorHarmonyNote: string;
  anchorImageRef?: string | null;
  outfitJson: unknown;
  paletteJson: unknown;
}

export async function recordWardrobeAnalysisSql(input: {
  userId: number;
  itemName: string;
  category: string;
  season: string;
  aesthetic: string;
  stylePersonality: string;
  stylingStrategy: string;
  analysisJson: unknown;
}) {
  try {
    const rows = await db
      .insert(wardrobeAnalyses)
      .values({
        userId: input.userId,
        itemName: input.itemName,
        category: input.category,
        season: input.season,
        aesthetic: input.aesthetic,
        stylePersonality: input.stylePersonality,
        stylingStrategy: input.stylingStrategy,
        analysisJson: input.analysisJson,
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database query failed in recordWardrobeAnalysisSql:', error);
    throw new Error('Failed to store wardrobe analysis.', { cause: error });
  }
}

export async function listWardrobeAnalysesSql(userId: number, limit = 12) {
  try {
    return await db
      .select()
      .from(wardrobeAnalyses)
      .where(eq(wardrobeAnalyses.userId, userId))
      .orderBy(desc(wardrobeAnalyses.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Database query failed in listWardrobeAnalysesSql:', error);
    throw new Error('Failed to load wardrobe analyses.', { cause: error });
  }
}

export async function upsertSavedOutfitSql(input: SaveOutfitSqlInput) {
  try {
    const rows = await db
      .insert(savedOutfitsSql)
      .values({
        clientLookId: input.clientLookId,
        userId: input.userId,
        anchorItemName: input.anchorItemName,
        occasion: input.occasion,
        title: input.title,
        colorPaletteCategory: input.colorPaletteCategory ?? null,
        moodSummary: input.moodSummary,
        colorHarmonyNote: input.colorHarmonyNote,
        anchorImageRef: input.anchorImageRef ?? null,
        outfitJson: input.outfitJson,
        paletteJson: input.paletteJson,
      })
      .onConflictDoUpdate({
        target: [savedOutfitsSql.userId, savedOutfitsSql.clientLookId],
        set: {
          anchorItemName: input.anchorItemName,
          occasion: input.occasion,
          title: input.title,
          colorPaletteCategory: input.colorPaletteCategory ?? null,
          moodSummary: input.moodSummary,
          colorHarmonyNote: input.colorHarmonyNote,
          anchorImageRef: input.anchorImageRef ?? null,
          outfitJson: input.outfitJson,
          paletteJson: input.paletteJson,
        },
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database query failed in upsertSavedOutfitSql:', error);
    throw new Error('Failed to save outfit.', { cause: error });
  }
}

export async function listSavedOutfitsSql(userId: number) {
  try {
    return await db
      .select()
      .from(savedOutfitsSql)
      .where(eq(savedOutfitsSql.userId, userId))
      .orderBy(desc(savedOutfitsSql.createdAt));
  } catch (error) {
    console.error('Database query failed in listSavedOutfitsSql:', error);
    throw new Error('Failed to load saved outfits.', { cause: error });
  }
}

export async function deleteSavedOutfitSql(userId: number, clientLookId: string) {
  try {
    const deleted = await db
      .delete(savedOutfitsSql)
      .where(
        and(
          eq(savedOutfitsSql.userId, userId),
          eq(savedOutfitsSql.clientLookId, clientLookId),
        ),
      )
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    console.error('Database query failed in deleteSavedOutfitSql:', error);
    throw new Error('Failed to remove saved outfit.', { cause: error });
  }
}
