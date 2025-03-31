import { storage } from "../config/firebase.js";
import { v4 as uuidv4 } from "uuid";

const uploadToFirebase = async (text) => {
  try {
    const fileName = `transcriptions/${uuidv4()}.txt`;
    const file = storage.file(fileName);

    await file.save(text, {
      contentType: "text/plain",
    });

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return url;
  } catch (error) {
    throw new Error(`Failed to upload transcription: ${error.message}`);
  }
};

export { uploadToFirebase };
