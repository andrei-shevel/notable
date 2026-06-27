import type { Readable } from 'node:stream';
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { config } from '@/config';

// MinIO (and most self-hosted S3 endpoints) only support path-style addressing
// — `http://host/bucket/key` rather than the virtual-host `bucket.host/key`
// form — so forcePathStyle is mandatory here.
export const s3 = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
});

export type Storage = {
  // Streams `body` to object storage without buffering it in memory. The
  // length is unknown up front, so this uses a multipart upload (via
  // @aws-sdk/lib-storage) rather than a single PutObject, which would require
  // ContentLength.
  put(key: string, body: Readable, contentType: string): Promise<void>;
  get(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  // Server-side copy — the blob never leaves the object store, so this is cheap
  // even for large images (used when an image is pasted into another note).
  copy(srcKey: string, destKey: string): Promise<void>;
  // Idempotently create the bucket if it doesn't exist yet. MinIO starts with
  // no buckets, so the first upload would otherwise 404 (NoSuchBucket).
  ensureBucket(): Promise<void>;
};

export function createStorage(deps: { client: S3Client; bucket: string }): Storage {
  const { client, bucket } = deps;

  return {
    async put(key, body, contentType) {
      const upload = new Upload({
        client,
        params: { Bucket: bucket, Key: key, Body: body, ContentType: contentType },
      });
      try {
        await upload.done();
      } catch (err) {
        // On failure (e.g. the source stream was truncated past the size
        // limit) abort so a partial multipart upload isn't left dangling in
        // the bucket. Swallow abort errors — the original is what matters.
        // MinIO also purges stale incomplete uploads natively (see the
        // stale-upload settings on the minio service in docker-compose.yml),
        // which backstops the case where this abort never runs (e.g. a crash).
        await upload.abort().catch(() => {});
        throw err;
      }
    },

    async get(key) {
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      // In Node the SDK returns the body as a Readable stream; cast away the
      // browser/Blob members of the union that never apply server-side.
      return res.Body as Readable;
    },

    async delete(key) {
      // S3/MinIO DeleteObject is idempotent — deleting a missing key succeeds —
      // so callers don't have to guard against double deletes.
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    async copy(srcKey, destKey) {
      // CopySource is `<bucket>/<key>`. Our keys are URL-safe (uuid/uuid), so no
      // extra encoding is needed; encodeURI keeps it correct if that ever
      // changes without mangling the slash separators.
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: encodeURI(`${bucket}/${srcKey}`),
          Key: destKey,
        }),
      );
    },

    async ensureBucket() {
      try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
      } catch {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
      }
    },
  };
}
