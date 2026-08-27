export function Ball({ n, cls, size }: { n: number; cls: string; size?: string }) {
  return <span className={`ball ${cls} ${size || ''}`}>{n}</span>;
}
