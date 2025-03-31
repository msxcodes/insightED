import fs from "fs";
import xml2js from "xml2js";
import fetch from "node-fetch";
import { transcribeAudio } from "../config/openai.js";
import "dotenv/config";

const CLOUDFLARE_PROXY = "https://insight-ed.geniione3-eae.workers.dev";

const extractVideoId = (url) => {
  const match = url.match(
    /(?:v=|youtu\.be\/|\/embed\/|\/v\/|shorts\/)([^&#]{11})/
  );
  return match ? match[1] : null;
};

const fetchWithProxy = async (url) => {
  try {
    const proxyUrl = `${CLOUDFLARE_PROXY}/?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
    return await response.text();
  } catch (error) {
    console.warn(`⚠️ Proxy failed: ${error.message}`);
    throw new Error("All connection attempts failed.");
  }
};

const transcribeWithYouTubeAPI = async (videoUrl) => {
  try {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) throw new Error("Invalid YouTube URL");

    const html = await fetchWithProxy(
      `https://www.youtube.com/watch?v=${videoId}`
    );
    const match = html.match(/var ytInitialPlayerResponse\s*=\s*({.+?});/s);
    if (!match) throw new Error("Player response not found in HTML");

    const data = JSON.parse(match[1]);
    const captions =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captions?.length) throw new Error("No captions available");

    const englishTrack =
      captions.find((t) => t.languageCode === "en") || captions[0];
    const xml = await fetchWithProxy(englishTrack.baseUrl);

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