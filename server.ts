import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as googleTTS from 'google-tts-api';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

async function edgeTTS(text: string, voice: string, rate: number = 1, pitch: number = 1, volume: number = 1): Promise<Buffer> {
  // Extract lang from voice ID (e.g., "vi-VN-HoaiMyNeural" -> "vi-VN")
  const lang = voice.split('-').slice(0, 2).join('-');
  
  return new Promise((resolve, reject) => {
    const requestId = uuidv4().replace(/-/g, '');
    const ws = new WebSocket(
      `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F9&ConnectionId=${requestId}`,
      {
        headers: {
          "Cache-Control": "no-cache",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
          "Origin": "chrome-extension://jdicghplpicabbjclnnooomhpnmjalkm",
        }
      }
    );

    let audioData = Buffer.alloc(0);
    let isMetadataReceived = false;

    const timeout = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      reject(new Error("Edge TTS Timeout (15s) - No response from Microsoft"));
    }, 15000);

    ws.on('open', () => {
      const timestamp = new Date().toISOString();
      const timestampMs = Date.now();
      
      // Send configuration with a more standard header set
      const configMsg = `X-Timestamp:${timestamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
      ws.send(configMsg);

      const escapedText = escapeXml(text);
      
      // Edge TTS expects rates like "+10%", "default", etc.
      const rateStr = rate === 1 ? 'default' : (rate > 1 ? `+${Math.round((rate-1)*100)}%` : `-${Math.round((1-rate)*100)}%`);
      const pitchStr = pitch === 1 ? 'default' : (pitch > 1 ? `+${Math.round((pitch-1)*100)}%` : `-${Math.round((1-pitch)*100)}%`);
      const volStr = volume === 1 ? 'default' : (volume > 1 ? `+${Math.round((volume-1)*100)}%` : `-${Math.round((1-volume)*100)}%`);

      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'><voice name='${voice}'><prosody pitch='${pitchStr}' rate='${rateStr}' volume='${volStr}'>${escapedText}</prosody></voice></speak>`;
      
      const ssmlMsg = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMsg);
    });

    ws.on('message', (data, isBinary) => {
      try {
        if (isBinary) {
          const binData = Buffer.from(data as any);
          const separator = Buffer.from('Path:audio\r\n');
          const index = binData.indexOf(separator);
          
          if (index !== -1) {
            const payloadIdx = binData.indexOf(Buffer.from('\r\n\r\n'), index);
            if (payloadIdx !== -1) {
              audioData = Buffer.concat([audioData, binData.slice(payloadIdx + 4)]);
            }
          }
        } else {
          const msg = data.toString();
          if (msg.includes('Path:turn.end')) {
            clearTimeout(timeout);
            ws.close();
            if (audioData.length > 0) {
              resolve(audioData);
            } else {
              reject(new Error("Edge TTS reached end but collected zero bytes of audio."));
            }
          }
        }
      } catch (e) {
        reject(e);
      }
    });

    ws.on('close', (code, reason) => {
      if (ws.readyState !== WebSocket.CLOSED) ws.close();
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function fetchGoogleTTS(text: string, lang: string, slow: boolean = false): Promise<Buffer> {
  // Google TTS api mostly expects short language codes (vi, en, fr, etc.)
  const shortLang = lang.split('-')[0].split('_')[0];
  const url = googleTTS.getAudioUrl(text.slice(0, 200), {
    lang: shortLang,
    slow: slow,
    host: 'https://translate.google.com',
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch from Google TTS");
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Cloud TTS (legacy/simple)
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, lang = 'vi', speed = 1 } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });
      const url = googleTTS.getAudioUrl(text.slice(0, 200), {
        lang: lang,
        slow: speed < 0.8,
        host: 'https://translate.google.com',
      });
      res.json({ url });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // Download Proxy
  app.get("/api/download", async (req, res) => {
    try {
      const { url, filename } = req.query;
      if (!url) return res.status(400).send("URL required");
      const response = await fetch(url as string);
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${filename || 'speech.mp3'}"`);
      res.send(Buffer.from(buffer));
    } catch (error) {
      res.status(500).send("Download failed");
    }
  });

  // API Route for Cloud TTS Proxy (Using Google Translate for Maximum Stability)
  app.get("/api/tts-proxy", async (req, res) => {
    try {
      const { text, lang = 'vi', download, rate = '1' } = req.query;
      
      if (!text) return res.status(400).send("Text is required");

      const rawText = text.toString();
      const r = parseFloat(rate as string) || 1;
      const targetLang = lang?.toString() || 'vi';

      // Split text into 200-character chunks because Google TTS has a limit
      const chunks: string[] = [];
      const MAX_CHUNK_LENGTH = 180;
      
      // Smart split by sentence or space
      let remaining = rawText;
      while (remaining.length > 0) {
        if (remaining.length <= MAX_CHUNK_LENGTH) {
          chunks.push(remaining);
          break;
        }
        
        let splitIdx = remaining.lastIndexOf('.', MAX_CHUNK_LENGTH);
        if (splitIdx === -1) splitIdx = remaining.lastIndexOf('?', MAX_CHUNK_LENGTH);
        if (splitIdx === -1) splitIdx = remaining.lastIndexOf('!', MAX_CHUNK_LENGTH);
        if (splitIdx === -1) splitIdx = remaining.lastIndexOf(' ', MAX_CHUNK_LENGTH);
        if (splitIdx === -1) splitIdx = MAX_CHUNK_LENGTH;
        
        chunks.push(remaining.substring(0, splitIdx + 1).trim());
        remaining = remaining.substring(splitIdx + 1).trim();
      }

      console.log(`Processing Google TTS [${targetLang}] - Chunks: ${chunks.length}`);
      
      const buffers: Buffer[] = [];
      for (const chunk of chunks) {
        if (!chunk) continue;
        const buffer = await fetchGoogleTTS(chunk, targetLang, r < 0.8);
        buffers.push(buffer);
      }

      const finalBuffer = Buffer.concat(buffers);

      res.setHeader('Content-Type', 'audio/mpeg');
      if (download === 'true') {
        res.setHeader('Content-Disposition', 'attachment; filename="google-speech.mp3"');
      }
      res.send(finalBuffer);
    } catch (error) {
      console.error("TTS Proxy Error:", error);
      res.status(500).json({ error: "Dịch vụ Google TTS tạm thời không khả dụng." });
    }
  });

  //vite...
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
