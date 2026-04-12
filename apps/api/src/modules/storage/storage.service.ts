import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {}

  async storeToIpfs(data: Buffer | string): Promise<string> {
    const ipfsHost = this.configService.get('IPFS_HOST', 'localhost');
    const ipfsPort = this.configService.get('IPFS_PORT', 5001);

    try {
      // Dynamic import for ipfs-http-client
      const { create } = await import('ipfs-http-client' as any);
      const client = create({ host: ipfsHost, port: ipfsPort, protocol: 'http' });
      const result = await client.add(data);
      this.logger.log(`Stored on IPFS: ${result.cid.toString()}`);
      return result.cid.toString();
    } catch (error) {
      this.logger.error('IPFS storage failed', error);
      throw error;
    }
  }

  async retrieveFromIpfs(cid: string): Promise<Buffer> {
    const ipfsHost = this.configService.get('IPFS_HOST', 'localhost');
    const ipfsPort = this.configService.get('IPFS_PORT', 5001);

    try {
      const { create } = await import('ipfs-http-client' as any);
      const client = create({ host: ipfsHost, port: ipfsPort, protocol: 'http' });
      const chunks: Uint8Array[] = [];
      for await (const chunk of client.cat(cid)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`IPFS retrieval failed for CID ${cid}`, error);
      throw error;
    }
  }

  encrypt(data: string, key: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex').slice(0, 32), iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { encrypted, iv: iv.toString('hex') };
  }

  decrypt(encrypted: string, key: string, iv: string): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'hex').slice(0, 32),
      Buffer.from(iv, 'hex'),
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
