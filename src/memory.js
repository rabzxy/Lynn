const { MAX_MEMORY_MESSAGES } = require("./config");

const memories = new Map();

function getMemory(channelId) {
  if (!memories.has(channelId)) {
    memories.set(channelId, []);
  }

  return memories.get(channelId);
}

function addMessage(channelId, role, content, username) {
  const memory = getMemory(channelId);

  memory.push({
    role,
    content: `[${username}] ${content}`
  });

  while (memory.length > MAX_MEMORY_MESSAGES) {
    memory.shift();
  }
}

function clearMemory(channelId) {
  memories.delete(channelId);
}

module.exports = {
  getMemory,
  addMessage,
  clearMemory
};
