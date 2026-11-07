export type ClipKind = 'video' | 'image' | 'audio' | 'text' | 'graphic' | 'overlay';
export type TrackKind = 'video' | 'audio' | 'graphics' | 'text' | 'overlay';
export type ColorGrade = 'neutral' | 'warm' | 'cool' | 'cinematic';

export interface TimelineClip {
  id: string;
  type: ClipKind;
  label: string;
  source?: string;
  start: number;
  duration: number;
  track: TrackKind;
  text?: string;
  effect?: 'fade-in';
  style?: Record<string, string | number>;
}
export interface TimelineTrack { id: string; name: string; kind: TrackKind; clips: TimelineClip[] }
export interface TimelineProject { id: string; name: string; duration: number; colorGrade: ColorGrade; tracks: TimelineTrack[] }
export type OperationType = 'add-clip' | 'add-text' | 'add-audio' | 'add-overlay' | 'add-graphic' | 'color-grade';
export interface EditOperation { id: string; type: OperationType; params: Record<string, unknown>; summary: string }

export function createInitialTimeline(): TimelineProject {
  return {
    id: 'project-1', name: 'Untitled project', duration: 12, colorGrade: 'neutral',
    tracks: [
      { id: 'video', name: 'Video', kind: 'video', clips: [] },
      { id: 'graphics', name: 'Graphics', kind: 'graphics', clips: [] },
      { id: 'text', name: 'Text', kind: 'text', clips: [] },
      { id: 'audio', name: 'Audio', kind: 'audio', clips: [] },
      { id: 'overlay', name: 'Overlay', kind: 'overlay', clips: [] },
    ],
  };
}

export function validateOperation(operation: EditOperation): string[] {
  const p = operation.params;
  const errors: string[] = [];
  if (!operation || !operation.type) return ['Operation type is required.'];
  if (operation.type === 'add-clip') {
    const clip = p.clip as TimelineClip | undefined;
    if (!clip?.label?.trim()) errors.push('Media label is required.');
    if (!clip || !Number.isFinite(clip.start) || clip.start < 0) errors.push('Media start must be non-negative.');
    if (!clip || !Number.isFinite(clip.duration) || clip.duration <= 0) errors.push('Media duration must be positive.');
    if (clip && ['video', 'image'].includes(clip.type) && !clip.source) errors.push('Image/video clips need a source.');
  } else if (operation.type === 'add-text') {
    if (typeof p.text !== 'string' || !p.text.trim()) errors.push('Text content is required.');
    if (typeof p.start !== 'number' || p.start < 0) errors.push('Text start must be non-negative.');
    if (typeof p.duration !== 'number' || p.duration <= 0) errors.push('Text duration must be positive.');
  } else if (operation.type === 'add-audio' || operation.type === 'add-overlay' || operation.type === 'add-graphic') {
    if (typeof p.label !== 'string' || !p.label.trim()) errors.push('A label is required.');
    if (typeof p.duration !== 'number' || p.duration <= 0) errors.push('Duration must be positive.');
  } else if (operation.type === 'color-grade') {
    if (!['neutral', 'warm', 'cool', 'cinematic'].includes(String(p.grade))) errors.push('Choose a supported color grade.');
  } else errors.push('Unsupported operation type.');
  return errors;
}

export function applyOperation(project: TimelineProject, operation: EditOperation): TimelineProject {
  const errors = validateOperation(operation);
  if (errors.length) throw new Error(errors.join(' '));
  const next = structuredClone(project);
  if (operation.type === 'color-grade') {
    next.colorGrade = operation.params.grade as ColorGrade;
    return next;
  }
  const p = operation.params;
  let clip: TimelineClip;
  if (operation.type === 'add-clip') clip = structuredClone(p.clip as TimelineClip);
  else if (operation.type === 'add-text') clip = { id: String(p.id), type: 'text', label: String(p.label), text: String(p.text), start: Number(p.start), duration: Number(p.duration), track: 'text', effect: p.effect === 'fade-in' ? 'fade-in' : undefined, style: p.style as TimelineClip['style'] };
  else if (operation.type === 'add-audio') clip = { id: String(p.id), type: 'audio', label: String(p.label), source: typeof p.source === 'string' ? p.source : undefined, start: Number(p.start ?? 0), duration: Number(p.duration), track: 'audio' };
  else if (operation.type === 'add-overlay') clip = { id: String(p.id), type: 'overlay', label: String(p.label), source: typeof p.source === 'string' ? p.source : undefined, start: Number(p.start ?? 0), duration: Number(p.duration), track: 'overlay' };
  else clip = { id: String(p.id), type: 'graphic', label: String(p.label), start: Number(p.start ?? 0), duration: Number(p.duration), track: 'graphics' };
  const track = next.tracks.find((item) => item.kind === clip.track);
  if (!track) throw new Error(`Missing ${clip.track} track.`);
  track.clips.push(clip);
  next.duration = Math.max(next.duration, clip.start + clip.duration);
  return next;
}
