import { describe, expect, it } from 'vitest';
import { applyOperation, createInitialTimeline, EditOperation, validateOperation } from '@/lib/timeline';
import { parseInstruction } from '@/lib/instruction-parser';

describe('timeline model', () => {
  it('applies an operation immutably and updates duration', () => {
    const before = createInitialTimeline();
    const operation: EditOperation = { id: 'one', type: 'add-text', params: { id: 't1', label: 'Title', text: 'Hello', start: 1, duration: 5 }, summary: 'title' };
    const after = applyOperation(before, operation);
    expect(before.tracks.find((t) => t.kind === 'text')?.clips).toHaveLength(0);
    expect(after.tracks.find((t) => t.kind === 'text')?.clips).toHaveLength(1);
    expect(after.duration).toBe(12);
  });
  it('rejects invalid media duration and missing source', () => {
    const result = validateOperation({ id: 'bad', type: 'add-clip', summary: 'bad', params: { clip: { id: 'x', type: 'video', label: 'Clip', start: 0, duration: 0, track: 'video' } } });
    expect(result.length).toBeGreaterThan(0);
  });
  it('parses an end-to-end warm intro instruction into timeline changes', () => {
    const before = createInitialTimeline();
    const parsed = parseInstruction('add upbeat music, a title "Launch" that fades in, a logo overlay, a motion graphic intro, and grade everything warmer', before);
    expect(parsed.ok).toBe(true);
    const after = parsed.operations.reduce(applyOperation, before);
    expect(after.colorGrade).toBe('warm');
    expect(after.tracks.flatMap((t) => t.clips).some((clip) => clip.text === 'Launch' && clip.effect === 'fade-in')).toBe(true);
  });
});
