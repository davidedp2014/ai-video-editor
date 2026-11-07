'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { parseInstruction } from '@/lib/instruction-parser';
import { applyOperation, createInitialTimeline, EditOperation, TimelineProject } from '@/lib/timeline';

type HistoryEntry = { id: string; summary: string; before: TimelineProject; operations: EditOperation[] };

function draw(ctx: CanvasRenderingContext2D, project: TimelineProject, time: number) {
  const { width, height } = ctx.canvas;
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, project.colorGrade === 'warm' ? '#743d29' : project.colorGrade === 'cool' ? '#123356' : '#18243b');
  bg.addColorStop(1, project.colorGrade === 'warm' ? '#e5a84c' : project.colorGrade === 'cool' ? '#41779a' : '#573a78');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px sans-serif'; ctx.fillText(project.name, 32, 42);
  for (const track of project.tracks) for (const clip of track.clips) {
    if (time < clip.start || time > clip.start + clip.duration) continue;
    if (clip.type === 'audio') continue;
    const colors: Record<string, string> = { text: '#087f68', overlay: '#9b2869', graphic: '#947014', image: '#a44e1d', video: '#2367a8' };
    ctx.fillStyle = colors[clip.type] ?? '#3a65a7'; ctx.globalAlpha = clip.effect === 'fade-in' ? Math.min(1, (time - clip.start) / .7) : .92;
    const x = 70 + (track.clips.indexOf(clip) % 3) * 260; const y = 100 + project.tracks.indexOf(track) * 64;
    ctx.fillRect(x, y, 350, clip.type === 'text' ? 100 : 56); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(clip.label, x + 12, y + 25);
    if (clip.text) { ctx.font = '28px sans-serif'; ctx.fillText(clip.text, x + 12, y + 66); }
  }
}

export default function EditorApp() {
  const [project, setProject] = useState(createInitialTimeline);
  const [command, setCommand] = useState('add upbeat music, a title "My video" that fades in, and grade everything warmer');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [notice, setNotice] = useState('Ready. Run an instruction or import local media.');
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clips = useMemo(() => project.tracks.flatMap((track) => track.clips.map((clip) => ({ ...clip, trackName: track.name }))), [project]);

  const run = () => {
    const result = parseInstruction(command, project);
    if (!result.ok) { setNotice(result.errors.join(' ')); setError(true); return; }
    try {
      const next = result.operations.reduce(applyOperation, project);
      setHistory((entries) => [{ id: `${Date.now()}-${Math.random()}`, summary: result.operations.map((item) => item.summary).join(' · '), before: project, operations: result.operations }, ...entries]);
      setProject(next); setNotice(`Applied ${result.operations.length} validated operation(s).`); setError(false);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Could not apply that edit.'); setError(true); }
  };

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!/^(image|video|audio)\//.test(file.type)) { setNotice('Unsupported file. Choose an image, video, or audio file.'); setError(true); return; }
    const url = URL.createObjectURL(file); const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
    const track = type === 'audio' ? 'audio' : 'video';
    const operation: EditOperation = { id: `import-${Date.now()}`, type: 'add-clip', summary: `Imported ${file.name}`, params: { clip: { id: `media-${Date.now()}`, type, label: file.name, source: url, start: 0, duration: 5, track } } };
    try { const next = applyOperation(project, operation); setHistory((items) => [{ id: `${Date.now()}`, summary: operation.summary, before: project, operations: [operation] }, ...items]); setProject(next); setNotice(`Imported ${file.name}.`); setError(false); }
    catch (cause) { URL.revokeObjectURL(url); setNotice(cause instanceof Error ? cause.message : 'Media import failed.'); setError(true); }
  };

  const undo = (entry: HistoryEntry) => { setProject(entry.before); setHistory((items) => items.filter((item) => item.id !== entry.id)); setNotice(`Undid ${entry.summary}`); setError(false); };

  const exportVideo = async () => {
    setExporting(true);
    try {
      if (!('MediaRecorder' in window) || !HTMLCanvasElement.prototype.captureStream) throw new Error('This browser does not support canvas WebM export. Try a current version of Chrome, Edge, or Firefox.');
      const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Could not initialize the export canvas.');
      const stream = canvas.captureStream(24); const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime }); const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const stopped = new Promise<void>((resolve, reject) => { recorder.onstop = () => resolve(); recorder.onerror = () => reject(new Error('WebM recorder failed.')); });
      recorder.start(); const start = performance.now(); const duration = Math.max(2, Math.min(project.duration, 15)) * 1000;
      await new Promise<void>((resolve) => { const frame = (now: number) => { const elapsed = now - start; draw(ctx, project, Math.min(elapsed / 1000, project.duration)); if (elapsed < duration) requestAnimationFrame(frame); else { recorder.stop(); resolve(); } }; requestAnimationFrame(frame); });
      await stopped;
      const blob = new Blob(chunks, { type: mime }); if (!blob.size) throw new Error('The browser produced an empty export.');
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'video-export.webm'; link.click(); URL.revokeObjectURL(url); setNotice('WebM export downloaded.'); setError(false);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Video export failed.'); setError(true); }
    finally { setExporting(false); }
  };

  return <main>
    <header className="top"><div><h1>AI Video Editor</h1><span className="muted">Timeline-first editing in your browser</span></div><span className="muted">{clips.length} timeline item(s)</span></header>
    <div className="layout">
      <section className="column">
        <div className="panel"><h2>Instruction</h2><div className="command"><textarea value={command} onChange={(e) => setCommand(e.target.value)} aria-label="Edit instruction" /><button onClick={run}>Run edit</button></div><div className={`notice${error ? ' error' : ''}`}>{notice}</div></div>
        <div className="panel"><div className="controls"><h2>Timeline</h2><div><input ref={inputRef} hidden type="file" accept="image/*,video/*,audio/*" onChange={importFile} /><button className="secondary" onClick={() => inputRef.current?.click()}>Import media</button>{' '}<button onClick={exportVideo} disabled={exporting}>{exporting ? 'Exporting…' : 'Export WebM'}</button></div></div>
          {project.tracks.map((track) => <div className="track" key={track.id}><div className="track-name">{track.name}</div><div className="ruler">{track.clips.map((clip) => <div key={clip.id} className={`clip ${clip.type}`} title={clip.label} style={{ left: `${clip.start / Math.max(project.duration, 1) * 100}%`, width: `${Math.max(clip.duration / Math.max(project.duration, 1) * 100, 8)}%` }}>{clip.label}</div>)}</div></div>)}
        </div>
      </section>
      <aside className="column"><div className="panel"><h2>Preview</h2><canvas ref={canvasRef} className="preview" width={1280} height={720} /></div><div className="panel"><h2>Operation log</h2><div className="log">{history.length === 0 ? <span className="muted">No edits yet. Run an instruction to start.</span> : history.map((entry) => <div className="log-entry" key={entry.id}><div className="log-head"><strong>{entry.summary}</strong><button className="undo" onClick={() => undo(entry)}>Undo</button></div><small>{entry.operations.map((operation) => `${operation.type}: ${operation.summary}`).join('\n')}</small></div>)}</div></div></aside>
    </div>
  </main>;
}
