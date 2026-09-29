console.log("=== LYNN GEMINI AI LOADED ===");

const {
  GoogleGenAI
} = require("@google/genai");

const {
  SYSTEM_PROMPT
} = require("./config");

const {
  getMemory
} = require("./memory");

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    "GEMINI_API_KEY belum diisi."
  );
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function askAI(
  channelId,
  username,
  message
) {
  const memory =
    getMemory(channelId);

  const history = memory
    .map((item) => {
      if (item.role === "assistant") {
        return `Lynn: ${item.content}`;
      }

      return item.content;
    })
    .join("\n");

  const prompt = `
${SYSTEM_PROMPT}

RIWAYAT:
${history || "(kosong)"}

USER:
[${username}] ${message}

Jawab secara natural dan singkat.
`;

  const response =
    await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

  return (
    response.text?.trim() || null
  );
}

module.exports = {
  askAI
};
