require('dotenv').config({ debug: true });
const express = require('express');

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

// Storage backend routing: set STORAGE_BACKEND=s3 or STORAGE_BACKEND=local in .env
function getStorageBackend() {
  const backend = (process.env.STORAGE_BACKEND || 'local').toLowerCase();
  if (backend === 's3') {
    return require('./s3');
  }
  return require('./localstorage');
}

app.use(express.json({ limit: '100mb' }));

app.post('/upload', async (req, res) => {
  console.log(`[POST /upload] Received upload request.`);
  const { files, userid } = req.body;
  if (!files || !Array.isArray(files) || files.length === 0) {
    console.log(`[POST /upload] No files uploaded.`);
    return res.status(400).json({ message: 'No files uploaded.' });
  }

  try {
    const storage = getStorageBackend();
    const result = await storage.saveFiles({ files, userid });
    res.json({
      message: 'Files uploaded successfully.',
      guid: result.guid,
      files: result.files
    });
  } catch (err) {
    console.error(`[POST /upload] Error:`, err);
    res.status(500).json({ message: 'Upload failed.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Storage backend: ${process.env.STORAGE_BACKEND || 'local'}`);
});
