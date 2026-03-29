require('dotenv').config({ debug: true });
const express = require('express');
const multer = require('multer');
const { storage, asyncMulterStorage } = require('./localstorage');

const app = express();

// CORS middleware for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
const PORT = 3000;


app.use(express.json({ limit: '100mb' })); // For large blobs

app.post('/upload', async (req, res) => {
  console.log(`[POST /upload] Received upload request.`);
  const { files, userid } = req.body;
  if (!files || !Array.isArray(files) || files.length === 0) {
    console.log(`[POST /upload] No files uploaded.`);
    return res.status(400).json({ message: 'No files uploaded.' });
  }

  // Use the same logic as storage.destination to get the guid and subdir
  let guid;
  const { getOrCreateGuid } = require('./upstash');
  const path = require('path');
  const fs = require('fs');
  const { randomUUID } = require('crypto');
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  if (userid) {
    try {
      guid = await getOrCreateGuid(userid);
    } catch (e) {
      console.error(`[multer] Error in getOrCreateGuid:`, e);
      guid = randomUUID();
    }
  } else {
    guid = randomUUID();
  }
  const uploadSubdir = path.join(uploadDir, guid);
  if (!fs.existsSync(uploadSubdir)) {
    fs.mkdirSync(uploadSubdir, { recursive: true });
    console.log(`[multer] Created upload subdir: ${uploadSubdir}`);
  } else {
    console.log(`[multer] Using existing upload subdir: ${uploadSubdir}`);
  }

  // Write each file
  const savedFiles = [];
  for (const file of files) {
    if (!file.name || !file.data) continue;
    const filePath = path.join(uploadSubdir, file.name);
    try {
      const buffer = Buffer.from(file.data);
      fs.writeFileSync(filePath, buffer);
      savedFiles.push(file.name);
      console.log(`[multer] Saved file: ${filePath}`);
    } catch (e) {
      console.error(`[multer] Error saving file: ${filePath}`, e);
    }
  }

  res.json({
    message: 'Files uploaded successfully.',
    guid,
    files: savedFiles
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
