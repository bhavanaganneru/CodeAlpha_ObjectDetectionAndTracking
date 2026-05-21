import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = 3000;

  // Enhance request size limits for base64 image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Shared Gemini API client (server-side only)
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log('Gemini API client initialized successfully.');
  } else {
    console.warn('⚠️ GEMINI_API_KEY not set or contains default placeholder. AI detection feature will fall back to simulation.');
  }

  // API endpoint for computer vision scan (single image)
  app.post('/api/analyze', async (req, res): Promise<any> => {
    try {
      const { image, target } = req.body;

      if (!image) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      if (!ai) {
        return res.status(503).json({
          error: 'Gemini API is not configured. Please add your GEMINI_API_KEY in Settings > Secrets to enable real-time sweeps.',
          isSimulation: true
        });
      }

      // Base64 cleaning
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };

      const promptText = `
        You are a highly precise computer vision video analysis engine specializing in open-vocabulary object detection.
        Analyze the provided image and extract all instances of the designated target: "${target || 'any prominent objects'}".
        For each instance detected:
        1. Identify the exact bounding box in coordinates: [ymin, xmin, ymax, xmax] normalized on a scale of 0 to 1000 relative to the image boundaries.
        2. Give a confidence rating between 0.0 and 1.0.
        
        Ensure that the bounding boxes are tight and accurate. Follow the JSON response schema.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          imagePart,
          { text: promptText }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                object: {
                  type: Type.STRING,
                  description: 'The specific identified target class matching the user query.',
                },
                box_2d: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.INTEGER,
                  },
                  description: 'Four coordinates representing [ymin, xmin, ymax, xmax] scaled strictly between 0 and 1000.',
                },
                confidence: {
                  type: Type.NUMBER,
                  description: 'Model rating of the detection correctness from 0.0 to 1.0.',
                }
              },
              required: ['object', 'box_2d', 'confidence']
            }
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini model');
      }

      const detections = JSON.parse(responseText.trim());
      return res.json({ detections, isSimulation: false });

    } catch (error: any) {
      console.error('Error in /api/analyze:', error);
      return res.status(500).json({
        error: error.message || 'An internal error occurred during analysis.',
        isSimulation: true
      });
    }
  });

  // API Route to analyze multi-frame video sequence keyframes
  app.post('/api/analyze-video', async (req, res): Promise<any> => {
    try {
      const { targetObject, frames } = req.body;

      if (!targetObject || !frames || !Array.isArray(frames) || frames.length === 0) {
        return res.status(400).json({ error: 'Missing required parameters: targetObject & frames array.' });
      }

      if (!ai) {
        return res.status(503).json({
          error: 'Gemini API is not configured. Falling back to calibrated simulator feedback.',
          isSimulation: true
        });
      }

      const promptText = `
        You are an advanced computer vision model specializing in open-vocabulary object detection and video sequence tracking.
        Perform frame-by-frame object tracking of "${targetObject}" across these chronological video sequence frames.
        
        For each timestamped frame provided:
        - Detect if the object is visible. If visible, calculate its exact 2D normalized bounding box [ymin, xmin, ymax, xmax] scaled strictly between 0 and 1000.
        - If the object is hidden behind another entity, blocked, or out of frame, mark "occluded" as true and set "box_2d" to null.
      `;

      const contentsParts: any[] = [{ text: promptText }];

      // Feed keyframes as inline images chronologically
      frames.forEach((frame: { timestamp: string; dataUrl: string }, index: number) => {
        let base64Data = frame.dataUrl;
        let mimeType = 'image/jpeg';

        const commaIdx = base64Data.indexOf(',');
        if (commaIdx !== -1) {
          const header = base64Data.substring(0, commaIdx);
          base64Data = base64Data.substring(commaIdx + 1);
          const match = header.match(/data:(.*?);/);
          if (match && match[1]) {
            mimeType = match[1];
          }
        }

        contentsParts.push({ text: `Frame #${index + 1} at timestamp: ${frame.timestamp}` });
        contentsParts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contentsParts,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tracked_objects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    object_id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    tracking_sequence: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          timestamp: { type: Type.STRING },
                          box_2d: {
                            type: Type.ARRAY,
                            items: { type: Type.INTEGER },
                            description: '4 coordinates: [ymin, xmin, ymax, xmax] or null.'
                          },
                          occluded: { type: Type.BOOLEAN }
                        },
                        required: ['timestamp', 'occluded']
                      }
                    }
                  },
                  required: ['object_id', 'label', 'tracking_sequence']
                }
              }
            },
            required: ['tracked_objects']
          },
          temperature: 0.1
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from model');
      }

      const decodedResult = JSON.parse(responseText.trim());
      return res.json({ ...decodedResult, isSimulation: false });

    } catch (err: any) {
      console.error('Error in /api/analyze-video:', err);
      return res.status(500).json({
        error: err.message || 'An error occurred during video tracking.',
        isSimulation: true
      });
    }
  });

  // Serve app in dev or prod mode
  const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(path.resolve(__dirname, 'dist'));

  if (!isProduction) {
    console.log('Running in DEVELOPMENT mode with Vite Middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in PRODUCTION mode serving static dist files...');
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`🚀 CV Video Tracker server live at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
});
