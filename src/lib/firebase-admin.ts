import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'node:fs';
import path from 'node:path';

function resolveFirebaseProjectId(): string {
  if (process.env.FIREBASE_PROJECT_ID?.trim()) {
    return process.env.FIREBASE_PROJECT_ID.trim();
  }
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
      projectId?: string;
    };
    if (parsed.projectId) {
      return parsed.projectId;
    }
  } catch {
    // Fallback below if config file is omitted in serverless environment
  }
  return 'advance-creek-cwk2q';
}

if (!getApps().length) {
  initializeApp({
    projectId: resolveFirebaseProjectId(),
  });
}

export const adminAuth = getAuth();
