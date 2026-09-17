import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import type { ObjectStoragePort } from '@/domain/styling/ports';

export class S3ObjectStorage implements ObjectStoragePort {
  private client = new S3Client({ region: process.env.AWS_REGION });

  private bucket = process.env.S3_BUCKET!;

  private ready() {
    if (!this.bucket) {
      throw new Error('S3_BUCKET is not configured');
    }
  }

  async put(key: string, bytes: Uint8Array, contentType: string) {
    this.ready();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string) {
    this.ready();

    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    if (!response.Body) {
      throw new Error('S3 object body is empty');
    }

    return {
      bytes: new Uint8Array(await response.Body.transformToByteArray()),
      contentType: response.ContentType || 'application/octet-stream',
    };
  }

  async delete(key: string) {
    this.ready();
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
