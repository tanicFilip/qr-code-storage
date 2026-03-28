const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create a subdirectory for each upload based on a UUID
    if (!req._uploadUUID) {
      req._uploadUUID = generateUUID();
    }
    const subdir = path.join(uploadDir, req._uploadUUID);
    if (!fs.existsSync(subdir)) {
      fs.mkdirSync(subdir, { recursive: true });
    }
    file._uploadUUID = req._uploadUUID;
    cb(null, subdir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

app.post('/upload', upload.array('files'), (req, res) => {
  // req.files contains the uploaded files
  // req.body.source contains the source field
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded.' });
  }
  res.json({ message: 'Files uploaded successfully.', files: req.files.map(f => f.filename) });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
