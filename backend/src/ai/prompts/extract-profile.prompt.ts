export const EXTRACT_PROFILE_LLM_CONFIG = {
  timeoutMs: 8000,
  maxTokens: 600,
  temperature: 0.2,
};

export const ALLOWED_PROFILE_TAGS = [
  'spa',
  'wellness',
  'fine_dining',
  'casual',
  'wine',
  'cocktails',
  'sunset',
  'live_music',
  'jazz',
  'nightlife',
  'social',
  'romantic',
  'pool',
  'adventure',
  'golf',
  'fitness',
  'shopping',
  'luxury',
  'quiet',
  'lively',
] as const;

export const EXTRACT_PROFILE_SYSTEM_PROMPT = `
You are the guest-understanding engine for a luxury Las Vegas resort. Convert what a guest says about how they want their stay to feel into a structured stay profile.
Rules:
- Explicit selections are facts and override anything you infer from the text.
- Infer weights from emotional language, not just nouns: 'crazy few months' implies high wellness and low energy; 'something social' implies moderate nightlife and social.
- Pick 3-8 tags only from the allowed list: ${ALLOWED_PROFILE_TAGS.join(', ')}.
- If socialOptIn is not selected, set it true only if the guest clearly says they want to meet people or be social.
- Defaults if unknown: partySize from travelMode (solo 1, couple 2, friends 4, family 4), wakeAfter '09:00', budgetTier 3.
- summary: one sentence, second person, about the feeling of the stay, max 20 words, no exclamation marks.
Return JSON only, matching the schema exactly.
`.trim();

export function buildExtractProfilePrompt(prompt: string, selections: any): string {
  const schema = {
    mood: 'relaxed | indulgent | adventurous | romantic | social | recharge',
    pace: 'slow | balanced | packed',
    travelMode: 'solo | couple | friends | family',
    socialOptIn: 'boolean',
    weights: {
      wellness: 'number (0.0 to 1.0)',
      food: 'number (0.0 to 1.0)',
      nightlife: 'number (0.0 to 1.0)',
      exploration: 'number (0.0 to 1.0)',
      luxury: 'number (0.0 to 1.0)',
      energy: 'number (0.0 to 1.0)',
    },
    tags: 'string[] (3 to 8 tags from allowed list)',
    constraints: {
      partySize: 'number',
      wakeAfter: 'HH:MM (24h time, e.g. 09:00)',
      budgetTier: 'number (1 to 4)',
      dietary: 'string[]',
      notes: 'string',
    },
    summary: 'string (one sentence, second person, max 20 words, no exclamation marks)',
  };

  return `
Guest input text:
"${prompt}"

Explicit selections provided:
${JSON.stringify(selections || {}, null, 2)}

Target Output Schema:
${JSON.stringify(schema, null, 2)}

Return JSON only.
`.trim();
}
