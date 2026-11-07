# AI Video Editor

A small, browser-based video-editing starter built with Next.js App Router, React, and TypeScript. It includes a deterministic natural-language command parser, a validated serializable timeline, a preview, an undoable edit log, local media import, and WebM export.

## Install and run

**Requirements:** Node.js 18.17+ and npm.

```bash
git clone https://github.com/davidedp2014/ai-video-editor.git
cd ai-video-editor
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No API key, account, database, or environment file is required.

To make and run a production build:

```bash
npm run build
npm start
```

Run the tests and type check:

```bash
npm test
npm run typecheck
```

## Using the editor

1. Import an image, video, or audio file with **Import media** (optional).
2. Enter an edit request and choose **Run edit**.
3. Inspect the preview, timeline, and operation log. Use **Undo** on an entry to restore the state from before that edit batch.
4. Choose **Export WebM** to download the canvas-rendered result.

Example commands:

- `add a title "Summer trip" that fades in`
- `add upbeat music`
- `add a whoosh sound effect`
- `add a logo overlay`
- `add a motion graphic intro`
- `place the imported image on the timeline`
- `color-grade everything warmer`

The built-in parser is deterministic keyword-and-pattern matching, not a call to a hosted AI model. It reports unsupported or underspecified instructions instead of inventing source media or silently applying an unknown operation. For image/video/audio placement, import the source file first.

## Architecture

- `lib/timeline.ts` — serializable project, tracks, clips, operation types, validation, and immutable operation application. This is the source of truth.
- `lib/instruction-parser.ts` — maps recognized language to operations and rejects instructions it cannot resolve.
- `components/editor-app.tsx` — React UI, timeline, preview, local import, history/undo, and browser export.
- `app/` — Next.js App Router entry points and styles.

React and Next.js keep the editing interface responsive in the browser, while the pure TypeScript timeline and parser modules can be tested independently. The renderer is separate from the model so UI/export changes do not become the timeline's source of truth.

## Add an edit capability

1. Add its operation type and parameter shape in `lib/timeline.ts`.
2. Add validation and immutable application behavior there.
3. Map explicit instruction patterns to the validated operation in `lib/instruction-parser.ts`. Return a clarification/error for missing required inputs.
4. Render the new model data in `components/editor-app.tsx`.
5. Add validation and instruction-to-timeline tests under `lib/`.

## Limitations

This is a local browser starter, not a server-side codec pipeline. Export uses the browser's `MediaRecorder` and canvas capture, so WebM support depends on the browser. The preview/export renderer visualizes timeline elements; it is not a full nonlinear media compositor with decoded source-audio mixing, transitions, or MP4 encoding. Imported files stay in the current browser session and are not uploaded or persisted. Unsupported browsers show an export error rather than silently failing.
