import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Modality, type LiveServerMessage } from '@google/genai';
import { WebSocket, WebSocketServer } from 'ws';
import {
  classifyGeminiError,
  createApiApp,
  getLiveAiClient,
} from './src/server/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = createApiApp();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname === '/live') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
      return;
    }
    socket.destroy();
  });

  wss.on('connection', (clientWs) => {
    const ai = getLiveAiClient();
    if (!ai) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
        }),
      );
      clientWs.close();
      return;
    }

    let sessionPromise: ReturnType<typeof ai.live.connect> | null = null;
    let activeSession: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
    let isClosed = false;
    let didSendError = false;

    const sendToClient = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    const sendErrorOnce = (message: string) => {
      if (didSendError) return;
      didSendError = true;
      sendToClient({ type: 'error', message });
    };

    const startLiveSession = (voiceRaw: unknown, contextSummaryRaw: unknown) => {
      if (sessionPromise || isClosed) return;
      const validVoices = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];
      const voiceName =
        typeof voiceRaw === 'string' && validVoices.includes(voiceRaw)
          ? voiceRaw
          : 'Zephyr';
      const contextSummary =
        typeof contextSummaryRaw === 'string' && contextSummaryRaw.trim()
          ? contextSummaryRaw.trim().slice(0, 3000)
          : 'General wardrobe styling consultation.';

      const systemInstruction = [
        'You are the Atelier Edit Senior Virtual Stylist having a natural, real-time spoken conversation with a client.',
        'Keep responses warm, specific, tactile, and concise (2 to 4 crisp spoken sentences per turn unless the client asks for deep detail).',
        'Ground your advice in silhouettes, fabric contrast, color harmony, tailoring proportions, footwear, and accessories.',
        `Current Studio Context: ${contextSummary}`,
      ].join(' ');

      sessionPromise = ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            sendToClient({ type: 'ready', voiceName });
          },
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              sendToClient({
                type: 'inputTranscript',
                text: content.inputTranscription.text,
              });
            }
            if (content?.outputTranscription?.text) {
              sendToClient({
                type: 'outputTranscript',
                text: content.outputTranscription.text,
              });
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                sendToClient({
                  type: 'audio',
                  data: part.inlineData.data,
                });
              }
            }
            if (content?.interrupted) {
              sendToClient({ type: 'interrupted' });
            }
            if (content?.turnComplete) {
              sendToClient({ type: 'turnComplete' });
            }
          },
          onerror: (event) => {
            const errMsg =
              event && typeof event === 'object' && 'message' in event
                ? String((event as { message: unknown }).message)
                : 'Live voice session encountered a connection error.';
            sendErrorOnce(errMsg);
          },
          onclose: () => {
            if (!isClosed && !didSendError) {
              sendToClient({ type: 'closed' });
            }
          },
        },
      });

      sessionPromise
        .then((session) => {
          if (isClosed) {
            session.close();
            return;
          }
          activeSession = session;
        })
        .catch((err) => {
          const classified = classifyGeminiError(err);
          sendErrorOnce(classified.message);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        });
    };

    clientWs.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type?: string;
          voiceName?: string;
          contextSummary?: string;
          data?: string;
          text?: string;
        };

        if (msg.type === 'start') {
          startLiveSession(msg.voiceName, msg.contextSummary);
          return;
        }

        if (msg.type === 'stop') {
          isClosed = true;
          activeSession?.close();
          clientWs.close();
          return;
        }

        if (!sessionPromise) {
          startLiveSession(msg.voiceName, msg.contextSummary);
        }

        if (msg.type === 'audio' && typeof msg.data === 'string' && msg.data.length > 0) {
          sessionPromise?.then((session) => {
            if (!isClosed) {
              session.sendRealtimeInput({
                audio: {
                  data: msg.data as string,
                  mimeType: 'audio/pcm;rate=16000',
                },
              });
            }
          });
          return;
        }

        if (msg.type === 'text' && typeof msg.text === 'string' && msg.text.trim()) {
          const textPrompt = msg.text.trim();
          sessionPromise?.then((session) => {
            if (!isClosed) {
              session.sendClientContent({
                turns: [{ role: 'user', parts: [{ text: textPrompt }] }],
                turnComplete: true,
              });
            }
          });
        }
      } catch {
        // Ignore malformed client frames
      }
    });

    clientWs.on('close', () => {
      isClosed = true;
      try {
        activeSession?.close();
      } catch {
        // Ignore close errors
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Atelier Edit server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
