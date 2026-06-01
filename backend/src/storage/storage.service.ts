import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export type StoredFile = {
  key: string;
  url: string;
  size: number;
  mimeType: string;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.uploadDir = process.env.STORAGE_LOCAL_PATH ?? path.join(process.cwd(), 'uploads');
    this.baseUrl = process.env.STORAGE_BASE_URL ?? 'http://localhost:3000/uploads';

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async store(buffer: Buffer, originalName: string, mimeType: string): Promise<StoredFile> {
    const ext = path.extname(originalName) || '';
    const key = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const filePath = path.join(this.uploadDir, key);

    fs.writeFileSync(filePath, buffer);

    this.logger.log(`Stored file: ${key} (${buffer.length} bytes)`);

    return {
      key,
      url: `${this.baseUrl}/${key}`,
      size: buffer.length,
      mimeType,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`Deleted file: ${key}`);
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}
