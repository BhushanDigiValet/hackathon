import { execFileSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { LocalReelProvider } from './local-reel.provider';
import { wrapText, escapeXml } from './local-reel/reel-cards';
import { ReelSpec } from '../interfaces/video-generation.interface';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static');

const reel: ReelSpec = {
  title: 'Your Vegas, slowed down',
  chapters: [
    {
      time: '10:30',
      title: 'A slower morning',
      text: 'Heated basalt & cedar let the hurry dissolve.',
      category: 'spa',
    },
    {
      time: '19:30',
      title: 'An intimate dinner',
      text: 'Charred oak and cabernet turned the evening into a feast.',
      category: 'dining',
    },
  ],
  closingLine: 'The desert will keep your table warm.',
};

async function waitFor(
  provider: LocalReelProvider,
  jobId: string,
  timeoutMs = 60000,
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const s = await provider.checkStatus(jobId);
    if (s.status === 'completed' || s.status === 'failed') return s;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('render timed out');
}

describe('LocalReelProvider', () => {
  let dir: string;
  let provider: LocalReelProvider;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'reel-spec-'));
    provider = new LocalReelProvider(dir, 'http://localhost:3000');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('renders one card per chapter into a playable MP4', async () => {
    const { jobId, status } = await provider.generateVideo('reel', undefined, {
      prompt: 'reel',
      reel,
    });
    expect(status).toBe('processing');

    const done = await waitFor(provider, jobId);
    expect(done.status).toBe('completed');
    expect(done.videoUrl).toBe(`http://localhost:3000/reels/${jobId}.mp4`);
    expect(done.thumbnailUrl).toBe(`http://localhost:3000/reels/${jobId}.png`);

    const file = join(dir, 'reels', `${jobId}.mp4`);
    expect(existsSync(file)).toBe(true);

    // intro + 2 chapters + outro, minus 3 crossfades = 3.5 + 9 + 4 - 2.4
    expect(done.metadata?.durationSeconds).toBeCloseTo(14.1, 1);
    let probe = '';
    try {
      execFileSync(ffmpegPath, ['-hide_banner', '-i', file]);
    } catch (e: any) {
      probe = e.stderr.toString(); // ffmpeg exits non-zero with no output file
    }
    expect(probe).toMatch(/Video: h264/);
    expect(probe).toMatch(/1280x720/);
    const [, h, m, sec] = probe.match(/Duration: (\d+):(\d+):([\d.]+)/) || [];
    expect(Number(h) * 3600 + Number(m) * 60 + Number(sec)).toBeCloseTo(
      14.1,
      0,
    );
  }, 90000);

  it('returns a cached reel instantly for identical input', async () => {
    const first = await provider.generateVideo('reel', undefined, {
      prompt: 'reel',
      reel,
    });
    await waitFor(provider, first.jobId);

    const fresh = new LocalReelProvider(dir, 'http://localhost:3000');
    const second = await fresh.generateVideo('reel', undefined, {
      prompt: 'reel',
      reel,
    });
    expect(second.jobId).toBe(first.jobId);
    expect(second.status).toBe('completed');
  }, 90000);

  it('reports unknown jobs as failed', async () => {
    const s = await provider.checkStatus('local_reel_missing');
    expect(s.status).toBe('failed');
  });
});

describe('reel card helpers', () => {
  it('wraps text and truncates with an ellipsis', () => {
    const lines = wrapText('one two three four five six seven eight', 10, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
  });

  it('escapes XML special characters', () => {
    expect(escapeXml(`a & <b> "c" 'd'`)).toBe(
      'a &amp; &lt;b&gt; &quot;c&quot; &apos;d&apos;',
    );
  });
});
