import { S3Client, CreateBucketCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config.js";

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "loom",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "loomloom",
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.S3_BUCKET ?? "loom-dev-projects";

export async function ensureBucket() {
  try {
    await s3Client.send(
      new CreateBucketCommand({
        Bucket: BUCKET_NAME,
      }),
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.name !== "BucketAlreadyOwnedByYou") {
      console.error("Failed to create bucket:", err);
    }
  }
}

export async function uploadFile(key: string, content: Buffer | string, contentType = "application/octet-stream") {
  await ensureBucket();
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: typeof content === "string" ? content : content,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function downloadFile(key: string) {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }),
  );
  return response.Body;
}
