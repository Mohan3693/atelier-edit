# Atelier Edit

Virtual Stylist studio that analyzes a garment's palette and silhouette to generate **Casual**, **Business**, and **Night Out** flat-lay outfit options with prompt-based image editing, PDF lookbook export, and Firestore-synced saved looks.

## Local Development

```bash
npm install
cp .env.example .env
# Set GEMINI_API_KEY in .env
npm run dev
```

The app runs on `http://localhost:3000`.

## Deploying to Vercel from GitHub

1. Push this repository to GitHub and import the project in **Vercel** (`vercel.json` is preconfigured for Vite `dist/` output and `/api/*` serverless routing via `api/index.ts`).
2. Add the required Environment Variable in **Vercel Project Settings -> Environment Variables**:
   - `GEMINI_API_KEY` — Your Google Gemini API key.
   - *(Optional)* `VITE_LIVE_WS_URL` — Full `wss://.../live` URL of a dedicated Node WebSocket host if you want real-time Live Voice streaming enabled on Vercel.
3. Add your Vercel deployment domain (e.g. `your-app.vercel.app`) to **Firebase Console -> Authentication -> Settings -> Authorized Domains** so Google Sign-In works in production.
4. Deploy. Static assets, `/api/style/*` Gemini endpoints, PDF export, and Firebase Auth / Firestore lookbook persistence work out of the box.
