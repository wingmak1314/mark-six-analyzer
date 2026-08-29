// 波色分析 — 全部 49 球固定波色 + 全歷史逐期分析
import { useMemo, useState } from 'react';
import { Card } from './Card';
import { WaveBall } from './WaveBall';
import type { Draw } from '../lib/analyzer';
import {
  WAVE_COLORS,
  WAVE_ORDER,
  countWaveColors,
  waveColor,
  waveLabel,
  wavePattern,
  type WaveColor,
} from '../lib/colors';

interface Props {
  history: Draw[];
}

type ColorCounts = Record<WaveColor, number>;

function pct(value: number, total: number): string {
  return total ? `${(value / total * 100).toFixed(1)}%` : '0.0%';
}

function ColorStat({ color, count, total, label = waveLabel(color) }: {
  color: WaveColor;
  count: number;
  total: number;
  label?: string;
}) {
  const info = WAVE_COLORS[color];
  return (
    <div className={`color-stat color-stat-${color}`}>
      <div className="color-stat-title"><span className="color-dot" style={{ background: info.css }} />{label}</div>
      <div className="color-stat-value">{count.toLocaleString()}</div>
      <div className="color-stat-meta">{pct(count, total)} · 球數 {info.numbers.length}</div>
      <div className="color-stat-bar"><span style={{ width: `${total ? count / total * 100 : 0}%`, background: info.css }} /></div>
    </div>
  );
}

export function ColorAnalysis({ history }: Props) {
  const [year, setYear] = useState('all');
  const [query, setQuery] = useState('');
  const [includeSpecial, setIncludeSpecial] = useState(true);

  const years = useMemo(() => {
    return [...new Set(history.map(d => `20${d.draw.split('/')[0]}`))]
      .sort((a, b) => Number(b) - Number(a));
  }, [history]);

  const stats = useMemo(() => {
    const main = { red: 0, blue: 0, green: 0 } as ColorCounts;
    const special = { red: 0, blue: 0, green: 0 } as ColorCounts;
    const patterns: Record<string, number> = {};
    const byYear: Record<string, { draws: number; main: ColorCounts; special: ColorCounts }> = {};

    for (const d of history) {
      const mainCounts = countWaveColors(d.main);
      const specialColor = waveColor(d.special);
      for (const color of WAVE_ORDER) {
        main[color] += mainCounts[color];
        special[color] += specialColor === color ? 1 : 0;
      }
      const pattern = wavePattern(mainCounts);
      patterns[pattern] = (patterns[pattern] || 0) + 1;

      const y = `20${d.draw.split('/')[0]}`;
      if (!byYear[y]) byYear[y] = { draws: 0, main: { red: 0, blue: 0, green: 0 }, special: { red: 0, blue: 0, green: 0 } };
      byYear[y].draws += 1;
      for (const color of WAVE_ORDER) {
        byYear[y].main[color] += mainCounts[color];
        if (specialColor === color) byYear[y].special[color] += 1;
      }
    }

    const patternRows = Object.entries(patterns)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count);
    const yearRows = Object.entries(byYear).sort((a, b) => Number(b[0]) - Number(a[0]));
    return { main, special, patterns: patternRows, years: yearRows };
  }, [history]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter(d => {
      const matchYear = year === 'all' || `20${d.draw.split('/')[0]}` === year;
      if (!matchYear) return false;
      if (!q) return true;
      const drawNo = d.draw.split('/')[1];
      return d.draw.toLowerCase().includes(q)
        || drawNo.includes(q)
        || drawNo.replace(/^0+/, '').includes(q)
        || d.date.includes(q);
    });
  }, [history, year, query]);

  const totalMain = history.length * 6;
  const totalSpecial = history.length;
  const totalShown = includeSpecial ? totalMain + totalSpecial : totalMain;
  const shownCounts: ColorCounts = includeSpecial
    ? {
        red: stats.main.red + stats.special.red,
        blue: stats.main.blue + stats.special.blue,
        green: stats.main.green + stats.special.green,
      }
    : stats.main;

  return (
    <div className="color-page">
      <section className="color-hero">
        <div className="color-hero-kicker">🎨 WAVE COLOUR ANALYTICS</div>
        <h1>紅・藍・綠波色分析</h1>
        <p>逐期拆解主號碼 + 特別號 · 全部 {history.length.toLocaleString()} 期 49 球數據</p>
        <div className="color-legend">
          {WAVE_ORDER.map(color => (
            <span key={color} className="color-legend-item">
              <span className="color-dot" style={{ background: WAVE_COLORS[color].css }} />
              {waveLabel(color)} {WAVE_COLORS[color].numbers.length} 個
            </span>
          ))}
        </div>
      </section>

      <Card title="📊 波色總覽（主號碼 + 特別號）" icon="📊">
        <div className="color-scope-toggle">
          <button className={!includeSpecial ? 'dim-btn active' : 'dim-btn'} onClick={() => setIncludeSpecial(false)}>只計主號碼（{totalMain.toLocaleString()} 球）</button>
          <button className={includeSpecial ? 'dim-btn active' : 'dim-btn'} onClick={() => setIncludeSpecial(true)}>主號碼 + 特別號（{(totalMain + totalSpecial).toLocaleString()} 球）</button>
        </div>
        <div className="color-stat-grid">
          {WAVE_ORDER.map(color => <ColorStat key={color} color={color} count={shownCounts[color]} total={totalShown} />)}
        </div>
        <div className="color-fact-grid">
          <div className="color-fact"><span>📚 分析期數</span><b>{history.length.toLocaleString()} 期</b></div>
          <div className="color-fact"><span>🔴 主號碼平均/期</span><b>{(stats.main.red / Math.max(1, history.length)).toFixed(2)} 紅</b></div>
          <div className="color-fact"><span>🔵 主號碼平均/期</span><b>{(stats.main.blue / Math.max(1, history.length)).toFixed(2)} 藍</b></div>
          <div className="color-fact"><span>🟢 主號碼平均/期</span><b>{(stats.main.green / Math.max(1, history.length)).toFixed(2)} 綠</b></div>
        </div>
        <div className="gen-note">
          💡 官方波色固定：紅波 17 球、藍波 16 球、綠波 16 球，所以理論比例係 34.7% / 32.7% / 32.7%。統計差異只代表歷史樣本波動，唔代表下一期某種顏色機率會提高。
        </div>
      </Card>

      <div className="color-two-col">
        <Card title="⭐ 特別號波色分佈" icon="⭐">
          <div className="color-stat-grid color-stat-grid-compact">
            {WAVE_ORDER.map(color => <ColorStat key={color} color={color} count={stats.special[color]} total={totalSpecial} label={`${waveLabel(color)}特別號`} />)}
          </div>
          <div className="gen-note">特別號獨立計算，唔會混入主號碼統計。</div>
        </Card>

        <Card title="🔗 最常見主號碼波色組合" icon="🔗">
          <div className="pattern-list">
            {stats.patterns.slice(0, 10).map((row, index) => (
              <div className="pattern-row" key={row.pattern}>
                <span className="pattern-rank">{index + 1}</span>
                <span className="pattern-name">{row.pattern}</span>
                <div className="bc-bar"><div className="bc-fill" style={{ width: `${row.count / Math.max(1, stats.patterns[0]?.count) * 100}%`, background: 'linear-gradient(90deg, #e63946, #3b82f6, #22c55e)' }} /></div>
                <b>{row.count} 期</b>
                <small>{pct(row.count, history.length)}</small>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="📅 按年份波色統計" icon="📅">
        <div className="color-table color-year-table">
          <div className="color-table-row color-table-head"><span>年份</span><span>期數</span><span>🔴 紅波</span><span>🔵 藍波</span><span>🟢 綠波</span><span>特別號（紅/藍/綠）</span></div>
          {stats.years.map(([y, row]) => (
            <div className="color-table-row" key={y}>
              <b>{y}</b><span>{row.draws}</span>
              <span className="year-color-cell"><i style={{ background: WAVE_COLORS.red.css }} />{row.main.red}（{pct(row.main.red, row.draws * 6)}）</span>
              <span className="year-color-cell"><i style={{ background: WAVE_COLORS.blue.css }} />{row.main.blue}（{pct(row.main.blue, row.draws * 6)}）</span>
              <span className="year-color-cell"><i style={{ background: WAVE_COLORS.green.css }} />{row.main.green}（{pct(row.main.green, row.draws * 6)}）</span>
              <span>{row.special.red} / {row.special.blue} / {row.special.green}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title={`📋 全部逐期波色分析（${filtered.length.toLocaleString()} 期）`} icon="📋">
        <div className="color-filters">
          <select value={year} onChange={e => setYear(e.target.value)}>
            <option value="all">全部年份</option>
            {years.map(y => <option key={y} value={y}>{y} 年</option>)}
          </select>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜尋期號 / 日期（例如 083）" />
          <span className="filter-count">顯示 {filtered.length.toLocaleString()} / {history.length.toLocaleString()} 期</span>
        </div>
        <div className="color-table color-draw-table">
          <div className="color-table-row color-table-head"><span>期號</span><span>日期</span><span>6 個主號碼（按開出次序）</span><span>特別號</span><span>主號碼比例</span></div>
          {filtered.map(d => {
            const counts = countWaveColors(d.main);
            return (
              <div className="color-table-row" key={d.draw}>
                <b className="hist-draw">{d.draw}</b>
                <span className="hist-date">{d.date}</span>
                <span className="color-draw-balls">{d.main.map(n => <WaveBall key={n} n={n} />)}</span>
                <span className="color-special-cell"><WaveBall n={d.special} special /></span>
                <span className="color-ratio"><b>紅 {counts.red}</b> · <b>藍 {counts.blue}</b> · <b>綠 {counts.green}</b></span>
              </div>
            );
          })}
          {!filtered.length && <div className="no-result">冇搵到符合嘅期數</div>}
        </div>
        <div className="gen-note">
          💡 每行係一個真實開獎期：彩色波波 = 該號碼官方波色；黃色邊框 = 特別號。呢張表預設顯示全部歷史期數，唔會只截頭幾十期。
          <br />⚠️ 波色係號碼分類，唔會改變中獎機率；每一期獨立隨機。
        </div>
      </Card>
    </div>
  );
}
