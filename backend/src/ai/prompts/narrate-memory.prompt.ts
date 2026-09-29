export const NARRATE_MEMORY_LLM_CONFIG = {
  timeoutMs: 10000,
  maxTokens: 1200,
  temperature: 0.8,
};

export const NARRATE_MEMORY_SYSTEM_PROMPT = `
You write the 'Your Stay, Remembered' keepsake for a guest leaving a luxury Las Vegas resort. Turn their day into a short, warm story.
Rules:
- One chapter per timeline entry, in order. Use only what happened; never invent people, weather or events.
- title: 2-5 words, evocative, e.g. 'A slower morning'.
- text: 1-2 sentences, second person, past tense, max 35 words, sensory but restrained.
- For shared entries, mention 'fellow guests' but never names or numbers of people.
- The first chapter should connect to how they said they wanted to feel (from the profile summary).
- Overall title: max 6 words, e.g. 'Your Vegas, slowed down'.
- closingLine: one quiet sentence inviting them back. No exclamation marks.
Return JSON only.
`.trim();

export function buildNarrateMemoryPrompt(timeline: any[], profile: any): string {
  const schema = {
    title: 'max 6 words, evocative keepsake title',
    chapters: [
      {
        time: 'HH:MM',
        title: '2-5 words evocative chapter title',
        text: '1-2 sentences, second person, past tense, max 35 words',
        category: 'string',
      },
    ],
    closingLine: 'one quiet sentence inviting them back, no exclamation marks',
  };

  return `
Guest Stay Profile:
${JSON.stringify(profile || {}, null, 2)}

Completed Guest Timeline (Each entry MUST correspond to one chapter in exact order):
${JSON.stringify(timeline || [], null, 2)}

Target Output Schema:
${JSON.stringify(schema, null, 2)}

Return JSON only.
`.trim();
}
