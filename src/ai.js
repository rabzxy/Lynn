const OpenAI = require("openai");

const {
  MODEL,
  SYSTEM_PROMPT
} = require("./config");

const {
  getMemory
} = require("./memory");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function askAI(channelId, username, message) {
  const memory = getMemory(channelId);

  const conversation = [
    ...memory,
    {
      role: "user",
      content: `[${username}] ${message}`
    }
  ];

  const response = await openai.responses.create({
    model: MODEL,
    instructions: SYSTEM_PROMPT,

    input: conversation.map((item) => ({
      role: item.role,
      content: item.content
    })),

    max_output_tokens: 300
  });

  return response.output_text?.trim() || null;
}

module.exports = {
  askAI
};

