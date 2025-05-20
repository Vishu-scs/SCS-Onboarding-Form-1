import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

// AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

// Multer storage config
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

//  Upload to S3
const uploadToS3 = async (file) => {
  const fileStream = await fs.readFile(file.path);

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.filename,
      Body: fileStream,
      ContentType: file.mimetype,
    },
  });

  const result = await upload.done();

  // Clean up local temp file
  await fs.unlink(file.path);

  return {
    url: result.Location,
    key: file.filename,
  };
};

//  Delete from S3
const deleteFromS3 = async (key) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  };

  await s3Client.send(new DeleteObjectCommand(params));
};

export { upload, uploadToS3, deleteFromS3 };
