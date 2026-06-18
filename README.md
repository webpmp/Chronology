<p align="left">
  <a href="assets/screenshot.png"><img src="assets/screenshot.png" width="300" alt="Chronology Dashboard v1" /></a>
  <a href="assets/screenshot_updated.png"><img src="assets/screenshot_updated.png" width="300" alt="Chronology Dashboard v2" /></a>
</p>

# Chronology

Chronology is a professional, high-fidelity research and curation dashboard designed to extract, refine, and structure verified global facts, metrics, and scientific or technological breakthroughs. It provides a visual platform to build structured JSON datasets, which can be utilized for machine learning model tuning, retrieval-augmented generation (RAG), or detailed facts-based knowledge bases.

The dashboard integrates live visual state indicators, dual workflows (automatic Gemini-powered research and manual structured inputs), validation pipelines, and a direct JSON visualization.

---

## Key Features

- **Gemini AI Deep Research & Extractor**: Search or query complex topics using server-side Gemini models with real-time Google Search Grounding to automatically discover and extract high-confidence, verified assertions. You can select different Gemini models to use in Settings, or configure local models using LM Studio.
- **Bi-Directional Interactive Curation**: Discoveries are proposed as editable cards. Select, edit, rename, modify, or append suggested entries directly.
- **Manual Data Orchestration**: Append facts manually with a validation engine. It enforces unique, properly formatted uppercase snake_case identifier variables (e.g., `ASTRONOMY_SGR_A_MASS`).
- **Pending Actions Lifecycle**:
  - **Unsaved Modifications**: New facts are highlighted with an emerald border and background tint, with an `UNSAVED` badge.
  - **Unsaved Deletions**: Deleting facts marks them for `pending-deletion` (lower row opacity, strikethrough styling, `DELETING` status badge, and an interactive Redo/Undo arrow). Deleted blocks are highlighted in a red transparent background with a solid red left-gutter accent, before permanent disk purge.
- **Top Metrics Panel**: Clear visual status cards reporting current sync status (`STATUS: SYNCED` vs. `UNSAVED CHANGES` with (+X new / pending)), and total global dataset size.
- **Interactive JSON Code Viewer**: A customized, dark-themed code block displaying the entire structured JSON dataset dynamically highlighting newly created and deleted lines.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Motion, Lucide Icons
- **Backend Service**: Express, tsx
- **Core AI Integration**: Google Gen AI SDK (`@google/genai`) with Gemini model grounding
- **Build System**: Vite & esbuild (compiling server-side entry points to optimized standalone CommonJS outputs)

---

## Get Started

### Prerequisites

- Node.js (v18 or upwards recommended)
- Standard npm client

### Installation

1. Clone or extract the repository files:
   ```bash
   git clone <repository-url>
   cd chronology
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` configuration at the root of the project. You must supply your private Google Gen AI API key. Optionally, you can add external research sources by signing up for free API keys from [newsapi.org](https://newsapi.org) and [newsdata.io](https://newsdata.io):
   ```env
   # .env
   GEMINI_API_KEY=your-google-api-key-here

   # Optional news research keys:
   NEWS_API_KEY=your-newsapi-key-here
   NEWSDATA_API_KEY=your-newsdata-key-here
   ```

### Development Mode

To boot the dev server locally using standard `tsx` executing `server.ts` directly:
```bash
npm run dev
```
The application will run on [http://localhost:3000](http://localhost:3000).

### Build & Production Deployment

To build both the frontend single-page application (SPA) static bundle and compile the custom backend server into a single optimized CJS bundle using `esbuild`:
```bash
npm run build
```

To run the production deployment server using NodeJS:
```bash
npm run start
```

---

## Database & State Handling

The application leverages a local file-based database for persistence.
- Modifying and adding data is managed dynamically in memory.
- All additions and modifications remain isolated within the local session's state until **Commit & Save** is selected.
- Selecting **Commit & Save** triggers sequential validation and writes the formatted JSON payload to `/data/seed.json`, updating the session to `STATUS: SYNCED`.
