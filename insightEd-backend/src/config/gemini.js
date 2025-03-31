import axios from "axios";
import "dotenv/config";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const summarizeText = async (text) => {
    try {
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{
                        text: `Please summarize this transcript in clear, concise bullet points: ${text.substring(0, 30000)}`
                    }]
                }],
                safetySettings: [{
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_ONLY_HIGH"
                }],
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.8,
                    topK: 40
                }
            },
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error("Invalid API response structure");
        }

        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        const errorStatus = error.response?.status || 500;
        throw new Error(`Summarization failed (${errorStatus}): ${errorMessage}`);
    }
};

export { summarizeText };