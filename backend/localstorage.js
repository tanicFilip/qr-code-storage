const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { getOrCreateGuid } = require('./upstash');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = {
  destination: async function (req, file, cb) {
    console.log(`[multer] destination() called for file: ${file.originalname}`);
    let guid;
    if (req.body && req.body.userid) {
      try {
        guid = await getOrCreateGuid(req.body.userid);
      } catch (e) {
        console.error(`[multer] Error in getOrCreateGuid:`, e);
        guid = randomUUID();
      }
    } else {
      guid = randomUUID();
    }
    req._uploadUUID = guid;
    req._uploadSubdir = path.join(uploadDir, guid);
    if (!fs.existsSync(req._uploadSubdir)) {
      fs.mkdirSync(req._uploadSubdir, { recursive: true });
      console.log(`[multer] Created upload subdir: ${req._uploadSubdir}`);
    } else {
      console.log(`[multer] Using existing upload subdir: ${req._uploadSubdir}`);
    }
    cb(null, req._uploadSubdir);
  },
  filename: function (req, file, cb) {
    console.log(`[multer] filename() called for file: ${file.originalname}`);
    cb(null, file.originalname);
  }
};

function asyncMulterStorage(storage) {
  return {
    _handleFile: function (req, file, cb) {
      (async () => {
        try {
          const destination = await new Promise((resolve, reject) => {
            const maybePromise = storage.destination(req, file, (err, dest) => {
              if (err) return reject(err);
              resolve(dest);
            });
            if (maybePromise && typeof maybePromise.then === 'function') {
              maybePromise.then(resolve).catch(reject);
            }
          });

          const filename = await new Promise((resolve, reject) => {
            const maybePromise = storage.filename(req, file, (err, name) => {
              if (err) return reject(err);
              resolve(name);
            });
            if (maybePromise && typeof maybePromise.then === 'function') {
              maybePromise.then(resolve).catch(reject);
            }
          });

          const finalPath = path.join(destination, filename);
          const outStream = fs.createWriteStream(finalPath);
          file.stream.pipe(outStream);
          outStream.on('error', (e) => {
            cb(e);
          });
          outStream.on('finish', function () {
            cb(null, {
              destination,
              filename,
              path: finalPath,
              size: outStream.bytesWritten
            });
          });
        } catch (err) {
          cb(err);
        }
      })();
    },
    _removeFile: function (req, file, cb) {
      fs.unlink(file.path, cb);
    }
  };
}

module.exports = { storage, asyncMulterStorage };
