import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);

const downloadAudio = async (videoUrl) => {
  try {
    const outputPath = path.join("downloads", `${Date.now()}.mp3`);
    const command = `yt-dlp -x --audio-format mp3 -o "${outputPath}" ${videoUrl}`;

    await execPromise(command);
    return outputPath;
  } catch (error) {
    throw new Error(`Audio download failed: ${error.message}`);
  }
};

export { downloadAudio };
