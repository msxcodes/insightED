import { Router } from "express";
import rateLimit from "express-rate-limit";
import { downloadAudio } from "../controllers/youtube.controller.js";
import { processTranscription } from "../controllers/transcription.controller.js";
import { generateSummary } from "../controllers/summary.controller.js";
import { uploadToFirebase } from "../controllers/storage.controller.js";
import { sendWebSocketUpdate } from "../utils/websocket.js";

const router = Router();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
});

router.use(apiLimiter);

router.post("/summarize", async (req, res) => {
  const processStart = Date.now();
  
  try {
    const { youtubeUrl, isPremium = "false" } = req.body;
    if (!youtubeUrl) return res.status(400).json({ error: "Missing YouTube URL" });

    let audioPath;
    const metrics = {};

    if (isPremium === "true" || !youtubeUrl.includes('youtube.com')) {
      const downloadStart = Date.now();
      sendWebSocketUpdate("status", { message: "Downloading audio..." });
      audioPath = await downloadAudio(youtubeUrl);
      metrics.download = Date.now() - downloadStart;
    }

    sendWebSocketUpdate("status", { message: "Transcribing content..." });
    const transcribeStart = Date.now();
    const transcript = await processTranscription(youtubeUrl, audioPath, isPremium);
    metrics.transcription = Date.now() - transcribeStart;

    if (!transcript?.trim()) throw new Error("Empty transcription result");

    sendWebSocketUpdate("status", { message: "Generating summary..." });
    const summaryStart = Date.now();
    const summary = await generateSummary(transcript);
    metrics.summary = Date.now() - summaryStart;

    sendWebSocketUpdate("status", { message: "Uploading to storage..." });
    const uploadStart = Date.now();
    const fileUrl = await uploadToFirebase(summary);
    metrics.upload = Date.now() - uploadStart;

    return res.json({
      summary,
      fileUrl,
      metrics: {
        ...metrics,
        total: Date.now() - processStart
      }
    });
  } catch (error) {
    const errorDetails = {
      message: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      duration: Date.now() - processStart
    };

    console.error("Processing error:", errorDetails);
    return res.status(500).json({
      error: "Processing failed",
      ...(process.env.NODE_ENV === "development" && { details: error.message })
    });
  }
});

export default router;