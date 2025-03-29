import { downloadAudio } from "../services/youtube.service.js";
import { processTranscription } from "../services/transcription.service.js";
import { generateSummary } from "../services/summary.service.js";
import { uploadToFirebase } from "../services/storage.service.js";
import { sendWebSocketUpdate } from "../utils/websocket.js";

const summaryController = async (req, res) => {
  const processStart = Date.now();

  try {
    const { youtubeUrl, isPremium = "false", clientId } = req.body;
    console.log("Request body:", req.body);
    if (!youtubeUrl)
      return res.status(400).json({ error: "Missing YouTube URL" });
    if (!clientId) return res.status(400).json({ error: "Missing clientId" });

    let audioPath;
    const metrics = {};

    sendWebSocketUpdate(clientId, "status", {
      message: "Downloading audio...",
    });

    if (isPremium === "true" || !youtubeUrl.includes("youtube.com")) {
      const downloadStart = Date.now();
      audioPath = await downloadAudio(youtubeUrl);
      metrics.download = Date.now() - downloadStart;
    }

    sendWebSocketUpdate(clientId, "status", {
      message: "Transcribing content...",
    });
    const transcribeStart = Date.now();
    const transcript = await processTranscription(
      youtubeUrl,
      audioPath,
      isPremium
    );
    metrics.transcription = Date.now() - transcribeStart;

    if (!transcript?.trim()) throw new Error("Empty transcription result");

    sendWebSocketUpdate(clientId, "status", {
      message: "Generating summary...",
    });
    const summaryStart = Date.now();
    const summary = await generateSummary(transcript);
    metrics.summary = Date.now() - summaryStart;

    sendWebSocketUpdate(clientId, "status", {
      message: "Uploading to storage...",
    });
    const uploadStart = Date.now();
    const fileUrl = await uploadToFirebase(summary);
    metrics.upload = Date.now() - uploadStart;

    sendWebSocketUpdate(clientId, "status", { message: "Process completed!" });

    return res.json({
      summary,
      fileUrl,
      metrics: {
        ...metrics,
        total: Date.now() - processStart,
      },
    });
  } catch (error) {
    sendWebSocketUpdate(clientId, "error", {
      message: "An error occurred during processing",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal Server Error",
    });

    const errorDetails = {
      message: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      duration: Date.now() - processStart,
    };

    console.error("Processing error:", errorDetails);
    return res.status(500).json({
      error: "Processing failed",
      ...(process.env.NODE_ENV === "development" && { details: error.message }),
    });
  }
};

export { summaryController };
