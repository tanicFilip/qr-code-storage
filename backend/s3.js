const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');
const { getOrCreateGuid } = require('./upstash');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET;

/**
 * Save uploaded files to S3.
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
      console.error(`[s3] Error in getOrCreateGuid:`, e);
      guid = randomUUID();
    }
  } else {
    guid = randomUUID();
  }

  const savedFiles = [];
  for (const file of files) {
    if (!file.name || !file.data) continue;
    const key = `${guid}/${file.name}`;
    try {
      const buffer = Buffer.from(file.data);
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
      });
      await s3.send(command);
      savedFiles.push(file.name);
      console.log(`[s3] Uploaded file: s3://${BUCKET}/${key}`);
    } catch (e) {
      console.error(`[s3] Error uploading file: ${key}`, e);
    }
  }

  return { guid, files: savedFiles };
}

module.exports = { saveFiles };
