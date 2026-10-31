// Windows are grounded in the supplied sequence (240 frames), not elapsed time.
export const chapters = [
  { id: 'inicio', label: 'O primeiro olhar', start: 0, end: .115 },
  { id: 'escuta', label: 'O espaço da escuta', start: .155, end: .435 },
  { id: 'perceber', label: 'O encontro consigo', start: .455, end: .665 },
  { id: 'caminho', label: 'Um novo sentido', start: .695, end: .87 },
  { id: 'contato', label: 'O seu próximo passo', start: .885, end: 1.1 },
] as const;
export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export function visibility(p: number, start: number, end: number, fade = .035) {
  return Math.min(clamp01((p - start) / fade), clamp01((end - p) / fade));
}
