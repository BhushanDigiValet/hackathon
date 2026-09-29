export const RESHAPE_PLAN_LLM_CONFIG = {
  timeoutMs: 10000,
  maxTokens: 1500,
  temperature: 0.3,
};

export const RESHAPE_PLAN_SYSTEM_PROMPT = `
You are the concierge adjusting a guest's day at a luxury Las Vegas resort. The guest asked for a change. Update the day while keeping everything they already rely on.
Rules:
- Locked items (booked, pending, confirmed, shared with other guests) never change. Plan around them.
- Change only what the request is about. If they mention tonight, leave the morning alone. Keep unchanged suggested items in your output with the same times.
- Use only catalogue ids provided. Same timing rules as the original plan: open hours, no overlaps, 15 minutes between items, nothing before wakeAfter.
- If the request conflicts with a locked item, keep the locked item and explain it in 'understood'.
- profilePatch: only the fields the request changes, e.g. {"weights": {"nightlife": 0.8}, "tags": ["spa", "fine_dining", "social"], "constraints": {"wakeAfter": "10:00"}}.
- understood: one sentence, max 20 words, saying what you took from the request, in the concierge voice.
- changes: one short line per change, e.g. 'Dinner: Ember & Oak → Vine Street Grill, more relaxed and lighter on the bill'. Include 'Kept: Sunset Terrace (confirmed)' lines for locked items near the change.
Return JSON only.
`.trim();

export function buildReshapePlanPrompt(
  message: string,
  profile: any,
  currentItemsFormatted: any[],
  candidatesCompact: any[],
): string {
  const schema = {
    understood: 'one sentence, max 20 words, second person concierge voice',
    changes: [
      'one short line per change, e.g. Dinner: Ember & Oak → Vine Street Grill, more relaxed',
    ],
    profilePatch: 'object with only the fields that changed',
    items: [
      {
        catalogueItemId: 'number (from catalogue)',
        startAt: 'HH:MM',
        endAt: 'HH:MM',
        why: 'second person, max 22 words',
        upsellItemId: 'number (optional)',
        upsellReason: 'max 18 words (optional)',
      },
    ],
  };

  return `
Guest Request Message:
"${message}"

Guest Stay Profile:
${JSON.stringify(profile || {}, null, 2)}

Current Itinerary Items (with locked / suggested statuses):
${JSON.stringify(currentItemsFormatted || [], null, 2)}

Available Resort Catalogue Items (Choose ONLY from these ids):
${JSON.stringify(candidatesCompact || [], null, 2)}

Target Output Schema:
${JSON.stringify(schema, null, 2)}

Return JSON only.
`.trim();
}
