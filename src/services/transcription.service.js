import fs from "fs";
import xml2js from "xml2js";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { transcribeAudio } from "../config/openai.js";
import "dotenv/config";

const extractVideoId = (url) => {
  const match = url.match(
    /(?:v=|youtu\.be\/|\/embed\/|\/v\/|shorts\/)([^&#]{11})/
  );
  return match ? match[1] : null;
};

async function fetchFreeProxies() {
  try {
    const response = await fetch(
      "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all"
    );
    if (!response.ok) throw new Error("Failed to fetch proxies");

    const text = await response.text();
    return text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((proxy) => `http://${proxy.trim()}`);
  } catch (error) {
    console.error("Error fetching proxies:", error);
    return [];
  }
}

let proxyList = [];

async function refreshProxyList() {
  const newProxies = await fetchFreeProxies();
  if (newProxies.length > 0) {
    proxyList = newProxies;
    console.log(`✅ Proxy list updated: ${proxyList.length} proxies available`);
  }
}

const getProxy = () => {
  if (proxyList.length === 0) return null;
  return proxyList[Math.floor(Math.random() * proxyList.length)];
};

async function retryWithProxies(fn, retries = 30, delay = 1000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`⚠️ Attempt ${attempt + 1} failed: ${error.message}`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error("All proxy attempts failed.");
}

const fetchWithProxy = async (url, useProxy = true) => {
  let options = {};

  if (useProxy) {
    const proxy = getProxy();
    if (proxy) {
      console.log(`🌍 Trying proxy: ${proxy}`);
      options.agent = new HttpsProxyAgent(proxy);
    } else {
      console.warn(
        "⚠️ No proxy available, falling back to direct connection..."
      );
      return fetchWithProxy(url, false);
    }
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
    return await response.text();
  } catch (error) {
    console.warn(`⚠️ Proxy failed: ${error.message}`);

    if (useProxy) {
      console.log("🔄 Retrying with direct connection...");
      return fetchWithProxy(url, false);
    }

    throw new Error("All connection attempts failed.");
  }
};

const transcribeWithYouTubeAPI = async (videoUrl) => {
  try {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) throw new Error("Invalid YouTube URL");

    const html = await retryWithProxies(() =>
      fetchWithProxy(`https://www.youtube.com/watch?v=${videoId}`)
    );

    const match = html.match(/var ytInitialPlayerResponse\s*=\s*({.+?});/s);
    if (!match) throw new Error("Player response not found in HTML");

    const data = JSON.parse(match[1]);
    const captions =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captions?.length) throw new Error("No captions available");

    const englishTrack =
      captions.find((t) => t.languageCode === "en") || captions[0];

    const xml = await retryWithProxies(() =>
      fetchWithProxy(englishTrack.baseUrl)
    );

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

refreshProxyList();
setInterval(refreshProxyList, 10 * 60 * 1000);

export { processTranscription };
