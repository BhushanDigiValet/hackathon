import {
  ReelChapter,
  ReelSpec,
} from '../../interfaces/video-generation.interface';

/**
 * SVG title-card templates for the keyless local reel renderer.
 * Each card is a full-frame SVG that sharp rasterises to PNG before ffmpeg
 * stitches the cards into an MP4.
 */

export interface CardSize {
  width: number;
  height: number;
}

interface CategoryTheme {
  from: string;
  to: string;
  accent: string;
  label: string;
  motif: (cx: number, cy: number, r: number, color: string) => string;
}

const SERIF = "Didot, 'Bodoni 72', Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const ripples = (cx: number, cy: number, r: number, c: string) =>
  [1, 0.72, 0.46, 0.22]
    .map(
      (k) =>
        `<circle cx="${cx}" cy="${cy}" r="${r * k}" fill="none" stroke="${c}" stroke-width="2"/>`,
    )
    .join('');

const sunset = (cx: number, cy: number, r: number, c: string) =>
  `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z" fill="${c}"/>` +
  [0.25, 0.5, 0.75]
    .map(
      (k) =>
        `<line x1="${cx - r * 1.4}" y1="${cy + r * k * 0.5}" x2="${cx + r * 1.4}" y2="${cy + r * k * 0.5}" stroke="${c}" stroke-width="3"/>`,
    )
    .join('');

const plate = (cx: number, cy: number, r: number, c: string) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="3"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${r * 0.7}" fill="none" stroke="${c}" stroke-width="2"/>` +
  `<line x1="${cx - r * 1.35}" y1="${cy - r * 0.8}" x2="${cx - r * 1.35}" y2="${cy + r * 0.8}" stroke="${c}" stroke-width="4"/>` +
  `<line x1="${cx + r * 1.35}" y1="${cy - r * 0.8}" x2="${cx + r * 1.35}" y2="${cy + r * 0.8}" stroke="${c}" stroke-width="4"/>`;

const coupe = (cx: number, cy: number, r: number, c: string) =>
  `<path d="M ${cx - r} ${cy - r * 0.6} Q ${cx} ${cy + r * 0.5} ${cx + r} ${cy - r * 0.6} Z" fill="none" stroke="${c}" stroke-width="3"/>` +
  `<line x1="${cx}" y1="${cy - r * 0.05}" x2="${cx}" y2="${cy + r * 0.9}" stroke="${c}" stroke-width="3"/>` +
  `<line x1="${cx - r * 0.45}" y1="${cy + r * 0.9}" x2="${cx + r * 0.45}" y2="${cy + r * 0.9}" stroke="${c}" stroke-width="3"/>`;

const stars = (cx: number, cy: number, r: number, c: string) =>
  [
    [0, 0, 1],
    [-0.8, -0.5, 0.5],
    [0.7, -0.7, 0.6],
    [0.9, 0.4, 0.4],
    [-0.6, 0.7, 0.45],
  ]
    .map(([dx, dy, s]) => {
      const x = cx + dx * r;
      const y = cy + dy * r;
      const k = r * 0.28 * s;
      return `<path d="M ${x} ${y - k} L ${x + k * 0.25} ${y - k * 0.25} L ${x + k} ${y} L ${x + k * 0.25} ${y + k * 0.25} L ${x} ${y + k} L ${x - k * 0.25} ${y + k * 0.25} L ${x - k} ${y} L ${x - k * 0.25} ${y - k * 0.25} Z" fill="${c}"/>`;
    })
    .join('');

const diamond = (cx: number, cy: number, r: number, c: string) =>
  `<path d="M ${cx} ${cy - r} L ${cx + r * 0.7} ${cy} L ${cx} ${cy + r} L ${cx - r * 0.7} ${cy} Z" fill="none" stroke="${c}" stroke-width="3"/>` +
  `<path d="M ${cx} ${cy - r * 0.55} L ${cx + r * 0.38} ${cy} L ${cx} ${cy + r * 0.55} L ${cx - r * 0.38} ${cy} Z" fill="none" stroke="${c}" stroke-width="2"/>`;

const THEMES: Record<string, CategoryTheme> = {
  spa: {
    from: '#0f3b3a',
    to: '#5f8b7a',
    accent: '#e6d3a3',
    label: 'Spa',
    motif: ripples,
  },
  wellness: {
    from: '#0f3b3a',
    to: '#5f8b7a',
    accent: '#e6d3a3',
    label: 'Wellness',
    motif: ripples,
  },
  fitness: {
    from: '#1c2b33',
    to: '#3f6f5e',
    accent: '#d9e4c8',
    label: 'Fitness',
    motif: ripples,
  },
  dining: {
    from: '#3a0f17',
    to: '#9a4b2c',
    accent: '#f0cf8e',
    label: 'Dining',
    motif: plate,
  },
  food: {
    from: '#3a0f17',
    to: '#9a4b2c',
    accent: '#f0cf8e',
    label: 'Dining',
    motif: plate,
  },
  bar: {
    from: '#2a1030',
    to: '#8c4a5e',
    accent: '#f2c9b0',
    label: 'Bar',
    motif: coupe,
  },
  nightlife: {
    from: '#0a0f2c',
    to: '#4b2a7a',
    accent: '#d8c2ff',
    label: 'Nightlife',
    motif: stars,
  },
  experience: {
    from: '#4a1d0f',
    to: '#d9824a',
    accent: '#ffe2b0',
    label: 'Experience',
    motif: sunset,
  },
  sunset: {
    from: '#4a1d0f',
    to: '#d9824a',
    accent: '#ffe2b0',
    label: 'Sunset',
    motif: sunset,
  },
  in_room: {
    from: '#2e2620',
    to: '#8a7563',
    accent: '#f1e2cc',
    label: 'In-room',
    motif: diamond,
  },
};

const DEFAULT_THEME: CategoryTheme = {
  from: '#15151a',
  to: '#4a3f2c',
  accent: '#d9b56b',
  label: 'Your stay',
  motif: diamond,
};

export function themeFor(category?: string): CategoryTheme {
  return THEMES[(category || '').toLowerCase()] || DEFAULT_THEME;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Greedy word wrap; SVG text has no native wrapping. */
export function wrapText(
  text: string,
  maxChars: number,
  maxLines: number,
): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[\s.,;:]*$/, '') + '…';
    return kept;
  }
  return lines;
}

function tspans(lines: string[], x: number, lineHeight: number): string {
  return lines
    .map(
      (l, i) =>
        `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(l)}</tspan>`,
    )
    .join('');
}

function frame(size: CardSize, theme: CategoryTheme, body: string): string {
  const { width: w, height: h } = size;
  const m = Math.round(Math.min(w, h) * 0.05);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.from}"/>
      <stop offset="1" stop-color="${theme.to}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.75" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.6" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.45"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <rect width="${w}" height="${h}" fill="url(#vignette)"/>
  <rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" fill="none" stroke="${theme.accent}" stroke-opacity="0.35" stroke-width="1.5"/>
  ${body}
</svg>`;
}

export function introCard(size: CardSize, reel: ReelSpec): string {
  const theme = DEFAULT_THEME;
  const { width: w, height: h } = size;
  const portrait = h > w;
  const titleSize = Math.round(Math.min(w, h) * (portrait ? 0.1 : 0.095));
  const lines = wrapText(reel.title, portrait ? 14 : 26, 3);
  const titleTop = h / 2 - ((lines.length - 1) * titleSize * 1.15) / 2;
  const subtitle = reel.subtitle || 'Your stay, remembered';
  return frame(
    size,
    theme,
    `<g opacity="0.18">${theme.motif(w / 2, h / 2, Math.min(w, h) * 0.34, theme.accent)}</g>
  <text x="${w / 2}" y="${titleTop - titleSize * 1.3}" text-anchor="middle" font-family="${SANS}" font-size="${Math.round(titleSize * 0.26)}" letter-spacing="${Math.round(titleSize * 0.12)}" fill="${theme.accent}">${escapeXml(subtitle.toUpperCase())}</text>
  <text x="${w / 2}" y="${titleTop}" text-anchor="middle" font-family="${SERIF}" font-size="${titleSize}" fill="#fbf7ef">${tspans(lines, w / 2, titleSize * 1.15)}</text>
  <line x1="${w / 2 - titleSize}" y1="${titleTop + (lines.length - 1) * titleSize * 1.15 + titleSize * 0.7}" x2="${w / 2 + titleSize}" y2="${titleTop + (lines.length - 1) * titleSize * 1.15 + titleSize * 0.7}" stroke="${theme.accent}" stroke-width="2"/>`,
  );
}

export function chapterCard(
  size: CardSize,
  chapter: ReelChapter,
  index: number,
  total: number,
): string {
  const theme = themeFor(chapter.category);
  const { width: w, height: h } = size;
  const portrait = h > w;
  const unit = Math.min(w, h);
  const left = Math.round(w * (portrait ? 0.1 : 0.09));
  const titleSize = Math.round(unit * (portrait ? 0.085 : 0.085));
  const bodySize = Math.round(unit * (portrait ? 0.045 : 0.04));
  const titleLines = wrapText(
    chapter.title || theme.label,
    portrait ? 16 : 26,
    2,
  );
  const bodyLines = wrapText(
    chapter.text || '',
    portrait ? 30 : 52,
    portrait ? 6 : 4,
  );

  const eyebrowY = portrait ? h * 0.42 : h * 0.3;
  const titleY = eyebrowY + titleSize * 1.35;
  const ruleY =
    titleY + (titleLines.length - 1) * titleSize * 1.1 + titleSize * 0.55;
  const bodyY = ruleY + bodySize * 1.9;

  const motifR = unit * (portrait ? 0.2 : 0.22);
  const motifX = portrait ? w / 2 : w * 0.8;
  const motifY = portrait ? h * 0.2 : h * 0.5;

  const eyebrow = [chapter.time, theme.label]
    .filter(Boolean)
    .join('  ·  ')
    .toUpperCase();

  const dots = Array.from({ length: total }, (_, i) => {
    const gap = unit * 0.028;
    const x = w / 2 - ((total - 1) * gap) / 2 + i * gap;
    return `<circle cx="${x}" cy="${h - unit * 0.1}" r="${unit * (i === index ? 0.007 : 0.0045)}" fill="${theme.accent}" fill-opacity="${i === index ? 1 : 0.45}"/>`;
  }).join('');

  return frame(
    size,
    theme,
    `<g opacity="0.3">${theme.motif(motifX, motifY, motifR, theme.accent)}</g>
  <text x="${left}" y="${eyebrowY}" font-family="${SANS}" font-size="${Math.round(bodySize * 0.72)}" letter-spacing="${Math.round(bodySize * 0.28)}" fill="${theme.accent}">${escapeXml(eyebrow)}</text>
  <text x="${left}" y="${titleY}" font-family="${SERIF}" font-size="${titleSize}" fill="#fbf7ef">${tspans(titleLines, left, titleSize * 1.1)}</text>
  <line x1="${left}" y1="${ruleY}" x2="${left + titleSize * 1.4}" y2="${ruleY}" stroke="${theme.accent}" stroke-width="2"/>
  <text x="${left}" y="${bodyY}" font-family="${SERIF}" font-style="italic" font-size="${bodySize}" fill="#f3ece0" fill-opacity="0.92">${tspans(bodyLines, left, bodySize * 1.45)}</text>
  ${dots}`,
  );
}

export function outroCard(size: CardSize, reel: ReelSpec): string {
  const theme = DEFAULT_THEME;
  const { width: w, height: h } = size;
  const portrait = h > w;
  const fontSize = Math.round(Math.min(w, h) * 0.055);
  const lines = wrapText(
    reel.closingLine || 'Until next time.',
    portrait ? 22 : 40,
    4,
  );
  const top = h / 2 - ((lines.length - 1) * fontSize * 1.4) / 2;
  return frame(
    size,
    theme,
    `<g opacity="0.14">${theme.motif(w / 2, h / 2, Math.min(w, h) * 0.3, theme.accent)}</g>
  <text x="${w / 2}" y="${top}" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="${fontSize}" fill="#fbf7ef">${tspans(lines, w / 2, fontSize * 1.4)}</text>
  <line x1="${w / 2 - fontSize}" y1="${top + (lines.length - 1) * fontSize * 1.4 + fontSize * 1.2}" x2="${w / 2 + fontSize}" y2="${top + (lines.length - 1) * fontSize * 1.4 + fontSize * 1.2}" stroke="${theme.accent}" stroke-width="2"/>`,
  );
}
