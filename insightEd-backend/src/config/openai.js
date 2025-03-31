import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import "dotenv/config";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const transcribeAudio = async (audioPath) => {
    try {
        const formData = new FormData();
        formData.append("file", fs.createReadStream(audioPath));
        formData.append("model", "whisper-1");

        const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                ...formData.getHeaders(),
            },
        });

        return response.data.text;
    } catch (error) {
        throw new Error(`Transcription failed: ${error.message}`);
    }
};

export { transcribeAudio };