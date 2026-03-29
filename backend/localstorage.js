const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { getOrCreateGuid } = require('./upstash');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/**
 * Save uploaded files to local disk.
 * @param {object} options
 * @param {Array} options.files - Array of { name, type, size, data: number[] }
 * @param {string|null} options.userid
 * @returns {Promise<{ guid: string, files: string[] }>}
 */
async function saveFiles({ files, userid }) {
  let guid;
  if (userid) {
    try {
      guid = await getOrCreateGuid(userid);
    } catch (e) {
      console.error(`[localstorage] Error in getOrCreateGuid:`, e);
      guid = randomUUID();
    }
  } else {
    guid = randomUUID();
  }

  const uploadSubdir = path.join(uploadDir, guid);
  if (!fs.existsSync(uploadSubdir)) {
    fs.mkdirSync(uploadSubdir, { recursive: true });
    console.log(`[localstorage] Created upload subdir: ${uploadSubdir}`);
  } else {
    console.log(`[localstorage] Using existing upload subdir: ${uploadSubdir}`);
  }

  const savedFiles = [];
  for (const file of files) {
    if (!file.name || !file.data) continue;
    const filePath = path.join(uploadSubdir, file.name);
    try {
      const buffer = Buffer.from(file.data);
      fs.writeFileSync(filePath, buffer);
      savedFiles.push(file.name);
      console.log(`[localstorage] Saved file: ${filePath}`);
    } catch (e) {
      console.error(`[localstorage] Error saving file: ${filePath}`, e);
    }
  }

  return { guid, files: savedFiles };
}

module.exports = { saveFiles };
