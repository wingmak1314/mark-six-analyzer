// 摺疊說明 — 長文字預設收埋, 想睇先撳開 (普通用戶介面留白, 波同圖做主角)
import { useState } from 'react';
import type { ReactNode } from 'react';

export function Note({ children, label = '📖 詳情說明' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="note-wrap">
      <button className={open ? 'note-toggle open' : 'note-toggle'} onClick={() => setOpen(o => !o)}>
        {open ? '▾' : '▸'} {label}
      </button>
      {open && <div className="gen-note note-body">{children}</div>}
    </div>
  );
}
