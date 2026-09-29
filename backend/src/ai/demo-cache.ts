import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class DemoCache {
  private cacheDir = path.join(__dirname, 'demo-cache');

  getMode(): 'on' | 'off' | 'record' {
    const mode = process.env.DEMO_CACHE?.trim().toLowerCase();
    if (mode === 'on' || mode === 'record') return mode;
    return 'off';
  }

  getHash(input: any): string {
    const str = typeof input === 'string' ? input : JSON.stringify(input);
    return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
  }

  getFilePath(method: string, hash: string): string {
    return path.join(this.cacheDir, `${method}-${hash}.json`);
  }

  async get<T>(method: string, input: any): Promise<T | null> {
    if (this.getMode() !== 'on') return null;

    const hash = this.getHash(input);
    const filePath = this.getFilePath(method, hash);
    if (!fs.existsSync(filePath)) return null;

    // 1.2s artificial delay so UI animations (like "Understanding...") still play smoothly
    await new Promise((resolve) => setTimeout(resolve, 1200));

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  set(method: string, input: any, data: any): void {
    if (this.getMode() !== 'record') return;
    if (!data) return;

    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      const hash = this.getHash(input);
      const filePath = this.getFilePath(method, hash);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[demo-cache] Failed to write cache', err);
    }
  }
}
