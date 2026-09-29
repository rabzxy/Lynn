require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const {
  BOT_NAME,
  COOLDOWN_MS,
  AUTO_CHAT_CHANCE,
  MAX_RESPONSE_LENGTH
} = require("./config");

const {
  askAI
} = require("./ai");

const {
  addMessage,
  clearMemory
} = require("./memory");

if (!process.env.DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN belum diisi.");
}

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY belum diisi.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],

  partials: [
    Partials.Channel
  ]
});

const cooldowns = new Map();
const channelSettings = new Map();

function isAIEnabled(channelId) {
  return channelSettings.get(channelId) !== false;
}

function isOnCooldown(channelId) {
  const last = cooldowns.get(channelId);

  if (!last) {
    return false;
  }

  return Date.now() - last < COOLDOWN_MS;
}

function setCooldown(channelId) {
  cooldowns.set(channelId, Date.now());
}

function splitMessage(text) {
  const chunks = [];

  for (let i = 0; i < text.length; i += MAX_RESPONSE_LENGTH) {
    chunks.push(text.slice(i, i + MAX_RESPONSE_LENGTH));
  }

  return chunks;
}

client.once("ready", async () => {
  console.log(`Bot online sebagai ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("ai-on")
      .setDescription("Aktifkan auto-chat Lynn di channel ini."),

    new SlashCommandBuilder()
      .setName("ai-off")
      .setDescription("Matikan auto-chat Lynn di channel ini."),

    new SlashCommandBuilder()
      .setName("ai-status")
      .setDescription("Lihat status Lynn di channel ini."),

    new SlashCommandBuilder()
      .setName("ai-reset")
      .setDescription("Reset memory Lynn di channel ini.")
  ].map(command => command.toJSON());

  const rest = new REST({
    version: "10"
  }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands
      }
    );

    console.log("Slash commands terdaftar.");
  } catch (error) {
    console.error("Gagal register slash commands:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const channelId = interaction.channelId;

  if (interaction.commandName === "ai-status") {
    const enabled = isAIEnabled(channelId);

    return interaction.reply(
      `Lynn di channel ini: **${enabled ? "ON" : "OFF"}**`
    );
  }

  if (interaction.commandName === "ai-on") {
    channelSettings.set(channelId, true);

    return interaction.reply(
      "Lynn diaktifkan di channel ini."
    );
  }

  if (interaction.commandName === "ai-off") {
    channelSettings.set(channelId, false);

    return interaction.reply(
      "Lynn dimatikan di channel ini."
    );
  }

  if (interaction.commandName === "ai-reset") {
    clearMemory(channelId);

    return interaction.reply(
      "Memory Lynn di channel ini sudah di-reset."
    );
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) {
    return;
  }

  const channelId = message.channel.id;

  if (!isAIEnabled(channelId)) {
    return;
  }

  const mentioned = message.mentions.has(client.user);

  addMessage(
    channelId,
    "user",
    message.content,
    message.author.username
  );

  // Kalau Lynn di-mention, selalu jawab.
  if (mentioned) {
    await generateReply(message);
    return;
  }

  // Chat biasa hanya sesekali dibalas.
  if (isOnCooldown(channelId)) {
    return;
  }

  if (Math.random() > AUTO_CHAT_CHANCE) {
    return;
  }

  await generateReply(message);
});

async function generateReply(message) {
  const channelId = message.channel.id;

  if (isOnCooldown(channelId)) {
    return;
  }

  setCooldown(channelId);

  try {
    await message.channel.sendTyping();

    const prompt = message.content
      .replace(
        new RegExp(`<@!?${client.user.id}>`, "g"),
        ""
      )
      .trim();

    if (!prompt) {
      await message.reply("yoi?");
      return;
    }

    const answer = await askAI(
      channelId,
      message.author.username,
      prompt
    );

    if (!answer) {
      await message.reply("bentar, gue blank.");
      return;
    }

    const chunks = splitMessage(answer);

    for (const chunk of chunks) {
      await message.channel.send(chunk);
    }

    addMessage(
      channelId,
      "assistant",
      answer,
      BOT_NAME
    );

  } catch (error) {
    console.error("AI ERROR:", error);

    await message.reply(
      "AI gue lagi error bentar."
    );
  }
}

client.login(process.env.DISCORD_TOKEN);
