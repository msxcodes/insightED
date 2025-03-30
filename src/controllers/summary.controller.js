import { downloadAudio } from "../services/youtube.service.js";
import { processTranscription } from "../services/transcription.service.js";
import { generateSummary } from "../services/summary.service.js";
import { uploadToFirebase } from "../services/storage.service.js";
import { sendWebSocketUpdate } from "../utils/websocket.js";
import { logger } from "../utils/logger.js";

const summaryController = async (req, res) => {
  const processStart = Date.now();
  try {
    const { youtubeUrl, isPremium = "false" } = req.body;

    if (!youtubeUrl) {
      logger.warn("Missing YouTube URL in request", { youtubeUrl });
      return res.status(400).json({ error: "Missing YouTube URL" });
    }

    let audioPath;
    const metrics = {};

    logger.info("Starting audio download", { youtubeUrl, isPremium });
    sendWebSocketUpdate("status", { message: "Downloading audio..." });

    if (isPremium === "true" || !youtubeUrl.includes("youtube.com")) {
      const downloadStart = Date.now();
      audioPath = await downloadAudio(youtubeUrl);
      metrics.download = Date.now() - downloadStart;
      logger.info("Audio download completed", {
        youtubeUrl,
        duration: metrics.download,
      });
    }

    logger.info("Starting transcription", { youtubeUrl });
    sendWebSocketUpdate("status", { message: "Transcribing content..." });
    const transcribeStart = Date.now();
    const transcript = await processTranscription(
      youtubeUrl,
      audioPath,
      isPremium
    );
    metrics.transcription = Date.now() - transcribeStart;
    logger.info("Transcription completed", {
      youtubeUrl,
      duration: metrics.transcription,
    });

    if (!transcript?.trim()) {
      logger.error("Empty transcription result", { youtubeUrl });
      throw new Error("Empty transcription result");
    }

    logger.info("Starting summary generation", { youtubeUrl });
    sendWebSocketUpdate("status", { message: "Generating summary..." });
    const summaryStart = Date.now();
    const summary = await generateSummary(transcript);
    metrics.summary = Date.now() - summaryStart;
    logger.info("Summary generation completed", {
      youtubeUrl,
      duration: metrics.summary,
    });

    logger.info("Starting upload to Firebase", { youtubeUrl });
    sendWebSocketUpdate("status", { message: "Uploading to storage..." });
    const uploadStart = Date.now();
    const fileUrl = await uploadToFirebase(summary);
    metrics.upload = Date.now() - uploadStart;
    logger.info("Upload to Firebase completed", {
      youtubeUrl,
      duration: metrics.upload,
    });

    sendWebSocketUpdate("status", { message: "Process completed!" });

    const totalDuration = Date.now() - processStart;
    logger.info("Summary process completed successfully", {
      youtubeUrl,
      metrics: { ...metrics, total: totalDuration },
    });

    return res.json({
      summary,
      fileUrl,
      metrics: {
        ...metrics,
        total: totalDuration,
      },
    });
  } catch (error) {
    const errorDetails = {
      message: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      duration: Date.now() - processStart,
    };

    logger.error("Processing error occurred", {
      youtubeUrl: req.body.youtubeUrl,
      ...errorDetails,
    });

    return res.status(500).json({
      error: "Processing failed",
      ...(process.env.NODE_ENV === "development" && { details: error.message }),
    });
  }
};

export { summaryController };
