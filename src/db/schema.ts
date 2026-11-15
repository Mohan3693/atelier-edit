import { relations } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const wardrobeAnalyses = pgTable('wardrobe_analyses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  itemName: text('item_name').notNull(),
  category: text('category').notNull(),
  season: text('season').notNull(),
  aesthetic: text('aesthetic').notNull(),
  stylePersonality: text('style_personality').notNull(),
  stylingStrategy: text('styling_strategy').notNull(),
  analysisJson: jsonb('analysis_json').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const savedOutfitsSql = pgTable(
  'saved_outfits_sql',
  {
    id: serial('id').primaryKey(),
    clientLookId: text('client_look_id').notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    anchorItemName: text('anchor_item_name').notNull(),
    occasion: text('occasion').notNull(),
    title: text('title').notNull(),
    colorPaletteCategory: text('color_palette_category'),
    moodSummary: text('mood_summary').notNull(),
    colorHarmonyNote: text('color_harmony_note').notNull(),
    anchorImageRef: text('anchor_image_ref'),
    outfitJson: jsonb('outfit_json').notNull(),
    paletteJson: jsonb('palette_json').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('saved_outfits_user_look_idx').on(table.userId, table.clientLookId),
  ],
);

export const voiceSessions = pgTable('voice_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  anchorItemName: text('anchor_item_name').notNull(),
  voiceName: text('voice_name').notNull(),
  transcriptSummary: text('transcript_summary'),
  durationSeconds: integer('duration_seconds').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  wardrobeAnalyses: many(wardrobeAnalyses),
  savedOutfits: many(savedOutfitsSql),
  voiceSessions: many(voiceSessions),
}));

export const wardrobeAnalysesRelations = relations(wardrobeAnalyses, ({ one }) => ({
  user: one(users, {
    fields: [wardrobeAnalyses.userId],
    references: [users.id],
  }),
}));

export const savedOutfitsSqlRelations = relations(savedOutfitsSql, ({ one }) => ({
  user: one(users, {
    fields: [savedOutfitsSql.userId],
    references: [users.id],
  }),
}));

export const voiceSessionsRelations = relations(voiceSessions, ({ one }) => ({
  user: one(users, {
    fields: [voiceSessions.userId],
    references: [users.id],
  }),
}));
