import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to sync user profile.', { cause: error });
  }
}

export async function deleteUserAccountSql(userId: number): Promise<void> {
  try {
    await db.delete(users).where(eq(users.id, userId));
  } catch (error) {
    console.error('Database query failed in deleteUserAccountSql:', error);
    throw new Error('Failed to delete account records.', { cause: error });
  }
}
