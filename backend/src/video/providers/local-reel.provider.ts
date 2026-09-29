import { Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, promises as fs } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import * as sharp from 'sharp';
import {
  GenerateVideoRequest,
  IVideoProvider,
  ReelSpec,
  VideoGenerationOptions,
  VideoGenerationResult,
  VideoJobStatus,
} from '../interfaces/video-generation.interface';
import {
  CardSize,
  chapterCard,
  introCard,
  outroCard,
} from './local-reel/reel-cards';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string | null = require('ffmpeg-static');
const execFileAsync = promisify(execFile);

const FPS = 25;
const FADE_SECONDS = 0.8;
const INTRO_SECONDS = 3.5;
const CHAPTER_SECONDS = 4.5;
const OUTRO_SECONDS = 4;

interface LocalJob {
  record: VideoGenerationResult;
}

/**
 * Keyless video provider: renders an itinerary reel locally from structured
 * chapters. Each chapter becomes an SVG title card (rasterised with sharp),
 * and ffmpeg stitches them into an MP4 with a slow zoom and crossfades.
 *
 * Output is content-addressed, so re-rendering the same reel is instant,
 * which keeps stage demos deterministic.
 */
export class LocalReelProvider implements IVideoProvider {
  public readonly name = 'local';
  private readonly logger = new Logger(LocalReelProvider.name);
  private readonly jobs = new Map<string, LocalJob>();

  /**
   * @param publicDir Directory served statically by the app (reels go in `<publicDir>/reels`).
   * @param publicBaseUrl Absolute origin used to build playable URLs.
   */
  constructor(
    private readonly publicDir: string,
    private readonly publicBaseUrl: string,
  ) {
    if (!ffmpegPath) {
      throw new Error(
        'LocalReelProvider initialization failed: ffmpeg-static has no binary for this platform.',
      );
    }
  }

  public async generateVideo(
    builtPrompt: string,
    options?: VideoGenerationOptions,
    request?: GenerateVideoRequest,
  ): Promise<{
    jobId: string;
    status: VideoJobStatus;
    metadata?: Record<string, any>;
  }> {
    const reel =
      request?.reel || this.reelFromPrompt(request?.prompt || builtPrompt);
    const size = this.sizeFor(options?.aspectRatio);
    const hash = createHash('sha1')
      .update(JSON.stringify({ reel, size }))
      .digest('hex')
      .slice(0, 16);
    const jobId = `local_reel_${hash}`;
    const nowIso = new Date().toISOString();
    const outFile = join(this.reelsDir(), `${jobId}.mp4`);
    const posterFile = join(this.reelsDir(), `${jobId}.png`);

    const durationSeconds = this.totalSeconds(reel.chapters.length);
    const record: VideoGenerationResult = {
      jobId,
      status: 'processing',
      prompt: builtPrompt,
      provider: this.name,
      progress: 10,
      createdAt: nowIso,
      updatedAt: nowIso,
      options,
      metadata: {
        chapters: reel.chapters.length,
        durationSeconds,
        width: size.width,
        height: size.height,
      },
    };

    if (existsSync(outFile)) {
      this.complete(record, jobId, true);
      this.jobs.set(jobId, { record });
      return { jobId, status: 'completed', metadata: record.metadata };
    }

    const inFlight = this.jobs.get(jobId);
    if (inFlight && inFlight.record.status === 'processing') {
      return {
        jobId,
        status: 'processing',
        metadata: inFlight.record.metadata,
      };
    }

    this.jobs.set(jobId, { record });
    this.render(reel, size, outFile, posterFile)
      .then(() => this.complete(record, jobId, false))
      .catch((err) => {
        this.logger.error(`Reel render failed for ${jobId}: ${err.message}`);
        record.status = 'failed';
        record.error = 'Local reel rendering failed';
        record.updatedAt = new Date().toISOString();
      });

    return { jobId, status: 'processing', metadata: record.metadata };
  }

  public async checkStatus(jobId: string): Promise<VideoGenerationResult> {
    const job = this.jobs.get(jobId);
    if (job) return { ...job.record };

    // Survives restarts: a finished reel on disk is still a finished job.
    if (existsSync(join(this.reelsDir(), `${jobId}.mp4`))) {
      const nowIso = new Date().toISOString();
      const record: VideoGenerationResult = {
        jobId,
        status: 'processing',
        prompt: '',
        provider: this.name,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      this.complete(record, jobId, true);
      this.jobs.set(jobId, { record });
      return { ...record };
    }

    const nowIso = new Date().toISOString();
    return {
      jobId,
      status: 'failed',
      prompt: '',
      provider: this.name,
      error: 'Job not found',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  /** Renders every card to PNG, then encodes the MP4 and poster. */
  private async render(
    reel: ReelSpec,
    size: CardSize,
    outFile: string,
    posterFile: string,
  ): Promise<void> {
    const started = Date.now();
    const workDir = await fs.mkdtemp(join(this.reelsDir(), '.work-'));
    try {
      const svgs = [
        introCard(size, reel),
        ...reel.chapters.map((ch, i) =>
          chapterCard(size, ch, i, reel.chapters.length),
        ),
        outroCard(size, reel),
      ];
      const durations = [
        INTRO_SECONDS,
        ...reel.chapters.map(() => CHAPTER_SECONDS),
        OUTRO_SECONDS,
      ];

      // Rasterise at 1.5x so the slow zoom stays sharp.
      const pngs = await Promise.all(
        svgs.map(async (svg, i) => {
          const file = join(workDir, `card-${String(i).padStart(2, '0')}.png`);
          await sharp(Buffer.from(svg), { density: 108 })
            .resize(Math.round(size.width * 1.5), Math.round(size.height * 1.5))
            .png()
            .toFile(file);
          return file;
        }),
      );

      await fs.copyFile(pngs[Math.min(1, pngs.length - 1)], posterFile);

      const args = ['-y', '-hide_banner', '-loglevel', 'error'];
      pngs.forEach((p) => args.push('-i', p));
      args.push(
        '-filter_complex',
        this.filterGraph(durations, size),
        '-map',
        '[vout]',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '20',
        '-pix_fmt',
        'yuv420p',
        '-r',
        String(FPS),
        '-movflags',
        '+faststart',
        `${outFile}.part.mp4`,
      );

      await execFileAsync(ffmpegPath as string, args, {
        maxBuffer: 10 * 1024 * 1024,
      });
      await fs.rename(`${outFile}.part.mp4`, outFile);
      this.logger.log(
        `Rendered reel ${outFile} (${pngs.length} cards) in ${((Date.now() - started) / 1000).toFixed(1)}s`,
      );
    } finally {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  }

  /** zoompan per card, then chained xfade transitions. */
  private filterGraph(durations: number[], size: CardSize): string {
    const parts: string[] = [];
    durations.forEach((d, i) => {
      const frames = Math.round(d * FPS);
      const zoomIn = i % 2 === 0;
      const z = zoomIn
        ? `'min(1+0.07*on/${frames},1.07)'`
        : `'max(1.07-0.07*on/${frames},1)'`;
      parts.push(
        `[${i}:v]zoompan=z=${z}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${size.width}x${size.height}:fps=${FPS},setsar=1,format=yuv420p[v${i}]`,
      );
    });

    let prev = 'v0';
    let offset = 0;
    for (let i = 1; i < durations.length; i++) {
      offset += durations[i - 1] - FADE_SECONDS;
      const out = i === durations.length - 1 ? 'vout' : `x${i}`;
      parts.push(
        `[${prev}][v${i}]xfade=transition=fade:duration=${FADE_SECONDS}:offset=${offset.toFixed(2)}[${out}]`,
      );
      prev = out;
    }
    if (durations.length === 1) parts.push('[v0]null[vout]');
    return parts.join(';');
  }

  private complete(
    record: VideoGenerationResult,
    jobId: string,
    cached: boolean,
  ) {
    const nowIso = new Date().toISOString();
    record.status = 'completed';
    record.progress = 100;
    record.videoUrl = `${this.publicBaseUrl}/reels/${jobId}.mp4`;
    if (existsSync(join(this.reelsDir(), `${jobId}.png`))) {
      record.thumbnailUrl = `${this.publicBaseUrl}/reels/${jobId}.png`;
    }
    record.updatedAt = nowIso;
    record.completedAt = nowIso;
    record.metadata = { ...record.metadata, cached };
  }

  /** Free-text requests (POST /api/video/generate without a reel) become a one-card reel. */
  private reelFromPrompt(prompt: string): ReelSpec {
    const sentences = prompt
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      title: sentences[0]?.split(/\s+/).slice(0, 6).join(' ') || 'Your stay',
      chapters: [{ text: prompt.slice(0, 220) }],
    };
  }

  private sizeFor(aspectRatio?: string): CardSize {
    switch ((aspectRatio || '16:9').trim()) {
      case '9:16':
        return { width: 720, height: 1280 };
      case '1:1':
        return { width: 1080, height: 1080 };
      default:
        return { width: 1280, height: 720 };
    }
  }

  private totalSeconds(chapterCount: number): number {
    const cards = chapterCount + 2;
    const raw = INTRO_SECONDS + chapterCount * CHAPTER_SECONDS + OUTRO_SECONDS;
    return Number((raw - (cards - 1) * FADE_SECONDS).toFixed(1));
  }

  private reelsDir(): string {
    const dir = join(this.publicDir, 'reels');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }
}
