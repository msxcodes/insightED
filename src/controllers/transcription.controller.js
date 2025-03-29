import fs from "fs";
import xml2js from "xml2js";
import fetch from "node-fetch";
import { transcribeAudio } from "../config/openai.js";

const extractVideoId = (url) => {
  const match = url.match(
    /(?:v=|youtu\.be\/|\/embed\/|\/v\/|shorts\/)([^&#]{11})/
  );
  return match ? match[1] : null;
};

async function retry(fn, retries = 3, delay = 1000) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= retries) throw error;
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

const transcribeWithYouTubeAPI = async (videoUrl) => {
  try {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) throw new Error("Invalid YouTube URL");

    const html = await retry(async () => {
      const response = await fetch(
        `https://www.youtube.com/watch?v=${videoId}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch YouTube page");
      return await response.text();
    });

    const match = html.match(/var ytInitialPlayerResponse\s*=\s*({.+?});/s);
    if (!match) throw new Error("Player response not found in HTML");

    const data = JSON.parse(match[1]);
    const captions =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captions?.length) throw new Error("No captions available");

    const englishTrack =
      captions.find((t) => t.languageCode === "en") || captions[0];

    const xml = await retry(async () => {
      const response = await fetch(englishTrack.baseUrl);
      if (!response.ok) throw new Error("Failed to fetch captions XML");
      return await response.text();
    });

    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
    });
    const parsed = await parser.parseStringPromise(xml);

    const transcript = parsed.transcript.text
      ? []
          .concat(parsed.transcript.text)
          .map((t) => t._?.trim() || "")
          .join(" ")
      : "";

    return transcript;
  } catch (error) {
    console.error("YouTube transcription failed:", error.message);
    return null;
  }
};

const processTranscription = async (videoUrl, audioPath, isPremium) => {
  try {
    let transcript;

    if (isPremium === "true") {
      transcript = await transcribeAudio(audioPath);
      fs.unlinkSync(audioPath);
    } else {
      transcript = await transcribeWithYouTubeAPI(videoUrl);
    }

    if (!transcript) {
      throw new Error("Failed to transcribe the video.");
    }

    return transcript;
  } catch (error) {
    throw new Error(`Transcription process failed: ${error.message}`);
  }
};

export { processTranscription };
