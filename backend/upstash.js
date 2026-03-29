const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { randomUUID } = require('crypto');

const UPSTASH_URL = process.env.UPSTASH_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_TOKEN;

async function upstashGet(key) {
  console.log(`[Upstash] GET for key: ${key}`);
  const res = await fetch(`${UPSTASH_URL}/get/${key}`, {
    headers: {
      Authorization: UPSTASH_TOKEN
    }
  });
  const data = await res.json();
  console.log(`[Upstash] GET result:`, data);
  return data.result;
}

async function getOrCreateGuid(userId) {
  const key = `user:${userId}`;
  const guid = randomUUID();
  console.log(`[getOrCreateGuid] Called for userId: ${userId}, candidate guid: ${guid}`);

  // Atomic SET NX — only sets if key does not exist
  console.log(`[Upstash] SETNX for key: ${key}, guid: ${guid}`);
  const res = await fetch(`${UPSTASH_URL}/setnx/${key}/${guid}`, {
    headers: {
      Authorization: UPSTASH_TOKEN
    }
  });

  const data = await res.json();
  console.log(`[Upstash] SETNX result:`, data);

  if (data.result === 1) {
    // ✅ Key didn't exist, we created it
    console.log(`[getOrCreateGuid] Created new guid: ${guid} for userId: ${userId}`);
    return guid;
  } else {
    // ❌ Key already exists — fetch the existing value
    const existing = await upstashGet(key);
    console.log(`[getOrCreateGuid] Existing guid for userId ${userId}: ${existing}`);
    return existing;
  }
}

module.exports = { upstashGet, getOrCreateGuid };
