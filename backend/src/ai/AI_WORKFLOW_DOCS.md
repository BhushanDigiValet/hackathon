# Luxury AI Concierge Service - Complete Workflow & Technical Guide

This document details the complete end-to-end architecture, prompt engineering, data contracts, reliability mechanisms, and runtime workflows for the AI Concierge subsystem (`backend/src/ai/`).

---

## 📑 Table of Contents
1. [Overview & Philosophy](#1-overview--philosophy)
2. [High-Level Architecture & Interaction Flow](#2-high-level-architecture--interaction-flow)
3. [The Four Core AI Workflows](#3-the-four-core-ai-workflows)
   - [3.1 extractProfile()](#31-extractprofile)
   - [3.2 composePlan()](#32-composeplan)
   - [3.3 reshapePlan()](#33-reshapeplan)
   - [3.4 narrateMemory()](#34-narratememory)
4. [Guest Voice & Style Guidelines](#4-guest-voice--style-guidelines)
5. [Reliability & Demo Cache Architecture](#5-reliability--demo-cache-architecture)
6. [Error Handling & Fallback Strategy](#6-error-handling--fallback-strategy)
7. [Testing & Playground Guide](#7-testing--playground-guide)
8. [Integration Contract for Backend Teammates](#8-integration-contract-for-backend-teammates)

---

## 1. Overview & Philosophy

The AI Concierge service powers the core guest experience of the resort application. Rather than behaving like an algorithmic recommendation engine or an ML classifier, it acts as an **expert, discreet, luxury hotel concierge**.

### Guiding Principles:
- **LLM Integration, Not Machine Learning**: Operates on live prompt orchestration and Claude-based structured inference—no local training, vector databases, or embedding pipelines.
- **Fail-Safe & Non-Throwing**: Every method is guarded by `try/catch`. If an LLM call fails, times out, or produces malformed JSON, it logs a warning and returns `null`. The backend domain services maintain deterministic fallbacks.
- **Deterministic Stage Reliability**: Built-in `DemoCache` supports offline stage demos, rapid test execution, and live recording modes.
- **Data Protection**: Full database entities are never passed to the LLM. Only sanitized, compact catalogue definitions with essential scheduling tokens are sent.

---

## 2. High-Level Architecture & Interaction Flow

```
                      +-----------------------------+
                      |   Guest / Frontend Client   |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                     |                     |
               v                     v                     v
      +-----------------+   +-----------------+   +-----------------+
      | ProfileService  |   |   PlanService   |   |  MemoryService  |
      +--------+--------+   +--------+--------+   +--------+--------+
               |                     |                     |
               | extractProfile()    | compose / reshape   | narrateMemory()
               v                     v                     v
      +-------------------------------------------------------------+
      |                          AiService                          |
      |                 (backend/src/ai/ai.service.ts)              |
      +------------------------------+------------------------------+
                                     |
                +--------------------+--------------------+
                |                                         |
                v                                         v
     [DemoCache (demo-cache/)]                [callLlm() Anthropic API]
     - DEMO_CACHE=on: 1.2s cached replay      - timeout: 8s–12s
     - DEMO_CACHE=record: live write          - temperature: 0.2–0.8
     - DEMO_CACHE=off: bypass cache           - JSON parsing from { to }
```

---

## 3. The Four Core AI Workflows

### 3.1 `extractProfile()`

Converts raw, conversational guest text and explicit UI selections into a structured, validated stay profile.

- **Invoked By**: `ProfileService.extract(guestId, prompt, selections)`
- **Execution Config**: `timeout: 8000ms`, `maxTokens: 600`, `temperature: 0.2`
- **Prompt Template**: [`backend/src/ai/prompts/extract-profile.prompt.ts`](file:///home/anuj/Documents/Hackathon/hackathon/backend/src/ai/prompts/extract-profile.prompt.ts)

#### Workflow:
1. **Cache Lookup**: Checks `demo-cache/` for existing `{ prompt, selections }`.
2. **LLM Invocation**: Feeds the guest's words, selected chips, and allowed tags to Claude.
3. **Data Normalization & Enforcement**:
   - Explicit UI selections (`pace`, `travelMode`, `socialOptIn`, `wakeAfter`, `budgetTier`) **override** model inferences.
   - Emotional cues are translated into weights (e.g. *"crazy few months"* $\rightarrow$ `wellness >= 0.8`, `energy <= 0.4`).
   - Weights (`wellness`, `food`, `nightlife`, `exploration`, `luxury`, `energy`) are clamped to `[0.0, 1.0]`.
   - Tags are strictly filtered to the 20 approved resort tags (e.g. `spa`, `wellness`, `fine_dining`, `sunset`, `social`, etc.).
   - Defaults: `partySize` inferred from `travelMode` (solo: 1, couple: 2, friends: 4, family: 4), `wakeAfter: "09:00"`, `budgetTier: 3`.

#### Output Shape:
```json
{
  "mood": "relaxed",
  "pace": "slow",
  "travelMode": "solo",
  "socialOptIn": true,
  "weights": {
    "wellness": 0.9,
    "food": 0.85,
    "nightlife": 0.6,
    "exploration": 0.3,
    "luxury": 0.95,
    "energy": 0.3
  },
  "tags": ["spa", "wellness", "fine_dining", "sunset", "social"],
  "constraints": {
    "partySize": 1,
    "wakeAfter": "09:00",
    "budgetTier": 4,
    "dietary": [],
    "notes": "Desires deep relaxation, luxury pampering, and a social finish."
  },
  "summary": "You wanted to slow down, let the crazy months melt away, and savor an unhurried, luxurious day."
}
```

---

### 3.2 `composePlan()`

Synthesizes a cohesive single-day resort itinerary, adhering to pacing, open hours, locked commitments, and budget tiers.

- **Invoked By**: `PlanService.generate(guestId)`
- **Execution Config**: `timeout: 12000ms`, `maxTokens: 1500`, `temperature: 0.5`
- **Prompt Template**: [`backend/src/ai/prompts/compose-plan.prompt.ts`](file:///home/anuj/Documents/Hackathon/hackathon/backend/src/ai/prompts/compose-plan.prompt.ts)

#### Workflow:
1. **Catalogue Compaction**:
   - Transforms full `CatalogueItem` entities into compact tokens: `{ id, name, category, subcategory, price, priceTier, durationMin, openFrom, openTo, tags, blurb }`.
   - Queries `CatalogueItem` repository to find upgrade items where `details.upsellOfId === item.id` and attaches them as `upgrades: [{ id, name, price }]`.
2. **Locked Items Isolation**:
   - Formats existing non-suggested items (`booked`, `confirmed`, `shared`) as locked anchors.
   - Instructs LLM never to duplicate or move locked items.
3. **Itinerary Storytelling Rules**:
   - Morning: gentle start, nothing scheduled before `constraints.wakeAfter`.
   - Restorative middle: spa/pool hours before 14:00.
   - Sunset peak: sunset items placed between 17:30 and 19:30.
   - Dinner: placed between 19:00 and 21:00.
   - Nightlife/Social: scheduled after 21:30 (mandatory if `socialOptIn: true`).
   - Pacing: `slow` $\le 5$ items with wide gaps; `packed` up to 7 items.
4. **Post-Processing Validation**:
   - Drops unknown IDs or duplicated IDs.
   - Verifies `upsellItemId` strictly belongs to that item's `upgrades`.
   - Recomputes `endAt = startAt + durationMin` if missing.
   - Sorts items chronologically by `startAt`.
   - Requires at least 3 valid items; otherwise returns `null` to trigger fallback.
5. **Dual-Contract Return**:
   - Returns `{ planSummary: string, items: ComposedPlanItem[] }` while also supporting array iteration and `.length` for backward compatibility.

---

### 3.3 `reshapePlan()`

Performs surgical modifications to an existing plan based on conversational guest feedback (e.g., *"Make tonight more social"*, *"I don't want to wake up before 10"*).

- **Invoked By**: `PlanService.reshape(guestId, message)`
- **Execution Config**: `timeout: 10000ms`, `maxTokens: 1500`, `temperature: 0.3`
- **Prompt Template**: [`backend/src/ai/prompts/reshape-plan.prompt.ts`](file:///home/anuj/Documents/Hackathon/hackathon/backend/src/ai/prompts/reshape-plan.prompt.ts)

#### Workflow:
1. **Status Tagging**: Distinguishes locked items from suggested items.
2. **Selective Modification**: Instructs the model to modify *only* the specific aspect requested while keeping untouched suggested items intact.
3. **Locked Conflict Defense**: If the guest asks to cancel or override a locked item (e.g. *"Cancel the sunset"*), the item is preserved, and the `understood` response explains why: *"Your sunset reservation is already confirmed, so we kept it safely in place."*
4. **Overlap Dropping**: Strips any unlocked item that collides in time with locked commitments.
5. **Output**: Returns `{ understood, changes, profilePatch, items }`, where `items` contains only the new list of unlocked suggestions.

---

### 3.4 `narrateMemory()`

Transforms the guest's completed timeline into a personalized keepsake story ("Your Stay, Remembered").

- **Invoked By**: `MemoryService.generateReel(guestId)`
- **Execution Config**: `timeout: 10000ms`, `maxTokens: 1200`, `temperature: 0.8`
- **Prompt Template**: [`backend/src/ai/prompts/narrate-memory.prompt.ts`](file:///home/anuj/Documents/Hackathon/hackathon/backend/src/ai/prompts/narrate-memory.prompt.ts)

#### Workflow:
1. **Timeline Mapping**: Receives sequential completed activities with timestamps and categories.
2. **Chapter Count Invariance**: The model must return exactly one chapter per timeline entry (`chapters.length === timeline.length`); otherwise, `AiService` discards the response and returns `null`.
3. **Data Integrity**: Timestamps (`time`) and `category` are copied directly from the original timeline rather than trusting LLM hallucinated values.
4. **Privacy Rule for Shared Events**: If an activity was attended in a shared group, the text mentions *"fellow guests"* with warmth, never inventing names or party sizes.

---

## 4. Guest Voice & Style Guidelines

Every piece of text generated by the AI adheres to the luxury hotel concierge voice:

| Guideline | Rule | Good Example | Bad Example |
| :--- | :--- | :--- | :--- |
| **Perspective** | Second person ("you") | *"You wanted a slower morning..."* | *"The guest wanted to relax..."* |
| **Punctuation** | No exclamation marks | *"Your table is ready."* | *"Enjoy your amazing dinner!"* |
| **Visuals** | No emojis | Calm, understated text. | *"Relax by the pool 🍹🏊"* |
| **Transparency** | No AI terminology | Never say *algorithm*, *AI*, *prompt*, *score*. | *"Our AI algorithm selected this item."* |
| **"why" line length** | $\le 22$ words | *"Heated river stones release deep tension, giving you the slow morning you asked for."* | Long promotional paragraphs. |
| **"upsellReason" length** | $\le 18$ words | *"Enjoy champagne and hand-crafted truffles in the private lounge after your treatment."* | *"Only $50 more to get a huge luxury upgrade!"* |

---

## 5. Reliability & Demo Cache Architecture

The demo cache ensures that live presentations and demos never stall due to external API latency, rate limits, or network interruptions.

```
DEMO_CACHE=on      --> Returns cached JSON (1.2s delay for realism) -> fallback to LLM
DEMO_CACHE=record  --> Calls LLM -> writes successful output to demo-cache/*.json
DEMO_CACHE=off     --> Direct LLM call
```

### Deterministic Hashing:
Cache keys are normalized and hashed via SHA-256 (truncated to 16 hex characters):
- `extractProfile`: `hash({ prompt, selections })`
- `composePlan`: `hash({ profileMood, profilePace, rawPrompt, lockedIds })`
- `reshapePlan`: `hash({ message, profileMood, lockedIds })`
- `narrateMemory`: `hash({ timelineCount, profileMood, timelineNames })`

Files are saved as:
`backend/src/ai/demo-cache/<method>-<hash>.json`

---

## 6. Error Handling & Fallback Strategy

To ensure high availability in production and during hackathon judging:

```typescript
try {
  // 1. Check DemoCache
  // 2. Build User Prompt
  // 3. Call LLM
  // 4. Validate Shape
  // 5. Filter IDs & Sanitize
  // 6. Record Cache
  return result;
} catch (error) {
  console.warn('[ai] <method> failed', error);
  return null;
}
```

- **AiService never throws**: Callers receive either a valid, sanitized object or `null`.
- **Domain Service Fallbacks**:
  - `ProfileService`: Applies keyword heuristic fallback on failure.
  - `PlanService`: Triggers `fallbackCompose()` rule-based scheduler if `composePlan` returns `null` or $< 3$ items.
  - `MemoryService`: Generates template-based chapter reflections if `narrateMemory` returns `null`.

---

## 7. Testing & Playground Guide

The test script [`backend/src/ai/ai.playground.ts`](file:///home/anuj/Documents/Hackathon/hackathon/backend/src/ai/ai.playground.ts) validates the entire suite:

```bash
cd backend
npx ts-node src/ai/ai.playground.ts
# or using yarn
yarn ts-node src/ai/ai.playground.ts
```

### Test Scenarios Covered:
1. **Hero Extract & Compose**: Spa before 14:00, sunset 17:30–19:30, dinner 19:00–21:00, live jazz after 21:30.
2. **Anniversary Couple**: Romantic mood, wake after 10:00, fine dining, no club.
3. **Bachelor Weekend**: Packed pace, energy $\ge 0.8$, golf, nightlife, show.
4. **Solo Business**: Balanced pace, evening-weighted social dinner.
5. **Rest & Recharge**: Slow pace, quiet pool, room service, no nightlife.
6. **Reshape a**: Nightlife added, morning unchanged, confirmed sunset preserved.
7. **Reshape b**: Morning spa shifted to 10:30.
8. **Reshape c**: Ember & Oak replaced with casual Vine Street Grill.
9. **Reshape d**: Helicopter tour added, exploration weight boosted.
10. **Reshape e**: Cancel sunset rejected because item is confirmed.
11. **Memory Keepsake**: 5 chapters matching completed timeline, shared event mentions fellow guests anonymously.

---

## 8. Integration Contract for Backend Teammates

### For BE1 (Plan Service):
> `composePlan` returns `{ planSummary: string, items: ComposedPlanItem[] }`.
> - Access the summary via `result.planSummary`.
> - Access items via `result.items` (or directly iterate over `result` as an array).

### Required Environment Variables:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...   # Required for live LLM mode
LLM_MODEL=claude-sonnet-5-5          # Optional (defaults to claude-sonnet-5-5)
DEMO_CACHE=on                        # Recommended for presentations ('on', 'off', 'record')
```
