import { applyOperation, EditOperation, TimelineProject, validateOperation } from '@/lib/timeline';

export interface ParseResult { ok: boolean; operations: EditOperation[]; errors: string[] }
const op = (type: EditOperation['type'], params: Record<string, unknown>, summary: string): EditOperation => ({ id: `${type}-${Math.random().toString(36).slice(2, 8)}`, type, params, summary });

export function parseInstruction(raw: string, project: TimelineProject): ParseResult {
  const text = raw.trim();
  if (!text) return { ok: false, operations: [], errors: ['Enter an edit instruction.'] };
  const s = text.toLowerCase();
  const ops: EditOperation[] = [];
  const add = (operation: EditOperation) => ops.push(operation);

  const titleMatch = text.match(/(?:title|text|caption)\s+["“']([^"”']+)["”']/i);
  if (/\b(title|text|caption)\b/.test(s)) {
    if (!titleMatch) return { ok: false, operations: [], errors: ['Please include the exact title text in quotes, for example: add a title "Summer trip".'] };
    add(op('add-text', { id: `text-${Date.now()}`, label: 'Title', text: titleMatch[1], start: 0.5, duration: 5, effect: /fade.?in/.test(s) ? 'fade-in' : undefined, style: { fontSize: 44, color: '#ffffff' } }, `Added title: ${titleMatch[1]}`));
  }
  if (/\b(music|soundtrack|upbeat music|ambient music)\b/.test(s)) add(op('add-audio', { id: `audio-${Date.now()}`, label: /upbeat/.test(s) ? 'Upbeat music' : 'Music', source: 'generated:music-placeholder', start: 0, duration: 8 }, 'Added a music timeline item.'));
  if (/\b(whoosh|sound effect|sfx|beep)\b/.test(s)) add(op('add-audio', { id: `sfx-${Date.now()}`, label: /whoosh/.test(s) ? 'Whoosh sound effect' : 'Sound effect', source: 'generated:sfx-placeholder', start: 0, duration: 2 }, 'Added a sound-effect timeline item.'));
  if (/\b(logo|overlay|lower third)\b/.test(s)) add(op('add-overlay', { id: `overlay-${Date.now()}`, label: /logo/.test(s) ? 'Logo overlay' : 'Overlay', source: 'overlay-placeholder', start: 0, duration: 5 }, 'Added an overlay timeline item.'));
  if (/\b(motion graphic|animated intro|intro graphic)\b/.test(s)) add(op('add-graphic', { id: `graphic-${Date.now()}`, label: 'Motion graphic intro', start: 0, duration: 5 }, 'Added a motion graphic.'));

  const grade = /\b(warm|warmer|golden)\b/.test(s) ? 'warm' : /\b(cool|cooler)\b/.test(s) ? 'cool' : /\b(cinematic|moody)\b/.test(s) ? 'cinematic' : undefined;
  if (grade) add(op('color-grade', { grade }, `Applied ${grade} color grading.`));

  const placeMedia = /\b(place|add|put|insert)\b/.test(s) && /\b(image|photo|video|clip|footage)\b/.test(s);
  if (placeMedia) {
    const media = project.tracks.flatMap((track) => track.clips).find((clip) => clip.source && (clip.type === 'image' || clip.type === 'video'));
    if (!media) return { ok: false, operations: [], errors: ['Import an image or video first, then ask to place the imported media on the timeline.'] };
    add(op('add-clip', { clip: { ...media, id: `placed-${Date.now()}`, start: 0, duration: Math.min(media.duration, 8) } }, `Placed ${media.label} on the timeline.`));
  }

  if (!ops.length) return { ok: false, operations: [], errors: ['I could not resolve that instruction. Try adding quoted title text, music, a logo overlay, a motion graphic, imported media, or a supported color grade.'] };
  for (const operation of ops) {
    const errors = validateOperation(operation);
    if (errors.length) return { ok: false, operations: [], errors };
  }
  try { ops.reduce(applyOperation, project); } catch (error) {
    return { ok: false, operations: [], errors: [error instanceof Error ? error.message : 'The edit could not be validated.'] };
  }
  return { ok: true, operations: ops, errors: [] };
}
