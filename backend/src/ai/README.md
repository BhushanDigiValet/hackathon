# AI Concierge Service (`backend/src/ai`)

This folder contains the LLM-powered guest-understanding and itinerary planning engine for the resort.

> 📖 **Full Workflow & Architecture Documentation**: See [`AI_WORKFLOW_DOCS.md`](./AI_WORKFLOW_DOCS.md) for complete technical details, prompt designs, safety fallbacks, and the concierge voice guide.

---

## 📁 Folder Structure

```text
backend/src/ai/
├── ai.module.ts              # Global NestJS module exporting AiService
├── ai.service.ts             # Core AiService (extractProfile, composePlan, reshapePlan, narrateMemory)
├── ai.playground.ts          # Test runner covering all 11 evaluation scenarios
├── demo-cache.ts             # Demo cache manager supporting 'on', 'off', and 'record' modes
├── seed-cache.ts             # Cache pre-recording utility for stage reliability
├── AI_WORKFLOW_DOCS.md       # Comprehensive workflow & developer documentation
│
├── demo-cache/               # Pre-recorded deterministic responses for presentations
│   └── *.json
│
└── prompts/                  # Prompt templates, builders, and execution configs
    ├── extract-profile.prompt.ts   # 8s, 600 tokens, temp 0.2
    ├── compose-plan.prompt.ts      # 12s, 1500 tokens, temp 0.5
    ├── reshape-plan.prompt.ts      # 10s, 1500 tokens, temp 0.3
    └── narrate-memory.prompt.ts    # 10s, 1200 tokens, temp 0.8
```

---curl -X POST http://localhost:3000/api/plan/reshape \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Actually I want tonight to be more social."
  }'


## ⚡ Quick Test Command

```bash
cd backend
npx ts-node src/ai/ai.playground.ts
# or
yarn ts-node src/ai/ai.playground.ts
```
