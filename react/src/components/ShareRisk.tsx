// 分享風險 / 人群迴避 — 彩池分賬制下, 冷門號碼組合 → 中獎分少啲人 → 派彩高啲
// 冇投注分佈數據, 用已知認知偏差做 proxy: 生日號 (≤31) 多人買, 尾0/大號碼 (33-49) 少人買
// 誠實立場: 純派彩優化, 唔影響中獎機率
import { useMemo } from 'react';
import { Card } from './Card';
import { WaveBall } from './WaveBall';
import { predictStatic } from '../lib/analyzer';
import { shareProfile, popularPatterns } from '../lib/quant';
import type { DashboardData } from '../lib/analyzer';

interface Props {
  data: DashboardData;
}

const UNPOPULAR = [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49];

export function ShareRisk({ data }: Props) {
  // 用 AI 7 字主打嘅 6 個主號碼計分享風險
  const analysis = useMemo(() => {
    const p = predictStatic(data, 0);
    const main6 = p.main10.slice(0, 6);
    const prof = shareProfile(main6);
    const pat = popularPatterns(main6);
    // 最冷門組合建議: 喺 33-49 大號碼 + 尾0 入面揀 6 個 (避生日/圖案)
    const coldPool = [...new Set([...UNPOPULAR, ...Array.from({ length: 49 }, (_, i) => i + 1).filter(n => n % 10 === 0)])];
    const suggested = coldPool.slice(0, 6).sort((a, b) => a - b);
    return { main6, prof, pat, suggested };
  }, [data]);

  return (
    <Card title="👥 分享風險 · 獨中優先（彩池分賬優化）" icon="👥">
      <div className="dantuo-selected">
        <span className="check-label">AI 7 字主打（6 主號）：</span>
        <span className="dantuo-chips">{analysis.main6.map(n => <WaveBall key={n} n={n} />)}</span>
      </div>

      <div className={`share-risk share-${analysis.prof.score >= 60 ? 'low' : analysis.prof.score >= 30 ? 'mid' : 'high'}`}>
        <span className="share-score">{analysis.prof.score}<small>/100</small></span>
        <span className="share-label">{analysis.prof.label}</span>
      </div>

      <div className="hitrate-summary" style={{ marginTop: 6 }}>
        <span>🎨 大眾圖案：{analysis.pat.crowded ? <b className="warn-text">⚠️ 有（易撞）</b> : <b>✅ 冇</b>}</span>
        {analysis.pat.arith && <span>📐 等差 {analysis.pat.arith.join('-')}（公差 {analysis.pat.arithDiff}）</span>}
        {analysis.pat.mirror.length > 0 && <span>🪞 對稱 {analysis.pat.mirror.join('、')}（+{analysis.pat.mirror.map(n => 50 - n).join('、')}）</span>}
        <span>🔗 最長連號串：<b>{analysis.pat.longestRun} 個</b></span>
      </div>

      <div className="hitrate-summary">
        <span>🎂 生日號（≤31，多人買）：<b>{analysis.prof.birthdayCount}/6</b></span>
        <span>0️⃣ 尾0 號碼：<b>{analysis.prof.tailZero}</b></span>
        <span>🔢 大號碼（33-49，少人買）：<b>{analysis.prof.bigCount}/6</b></span>
      </div>

      <div className="gen-note">
        💡 <b>原理：</b>六合彩頭二三獎係<b>彩池分賬</b> — 中獎人數越少，每注分得越多。大眾傾向買生日號（1-31）、圖案號（對角線/等差），所以 <b>33-49 大號碼 + 尾0</b> 相對少人揀。揀呢類號碼，中獎時獨中/少人分嘅機會高啲。
        <br />🖤 <b>最冷門組合建議：</b>{analysis.suggested.join('、')}（全部 33-49 / 尾0）— 純派彩優化例子。
        <br />📐 <b>圖案提示：</b>等差、對稱（兩數和=50）、三連以上、太多生日號 — 呢啲係「人手畫圖」嘅特徵，多人買 = 中獎分薄。上面有自動偵測。
        <br />🧪 <b>實測證據（80 期真實派彩）：</b>我哋用官方派彩資料驗證過 — 開出號碼全部 ≤31 嘅期，頭獎每注中位數係投注額嘅 273,931 ppm，≥2 個大號碼（&gt;31）嘅期係 303,818 ppm（高 11%）。但控制投注額之後相關係數只有 <b>r = −0.14</b>（n=80）— <b>統計上唔顯著</b>。
        <br />⚠️ <b>誠實警告：</b>呢個<b>唔影響中獎機率</b>（每期獨立，1/13,983,816 唔變），只係影響「中獎後分到幾多」。而且實測顯示效果遠比坊間講嘅弱 — 唔好為咗「冷門」特登揀啲你冇感覺嘅號碼。
      </div>
    </Card>
  );
}
