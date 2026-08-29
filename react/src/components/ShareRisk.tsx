// 分享風險 / 人群迴避 — 彩池分賬制下, 冷門號碼組合 → 中獎分少啲人 → 派彩高啲
// 冇投注分佈數據, 用已知認知偏差做 proxy: 生日號 (≤31) 多人買, 尾0/大號碼 (33-49) 少人買
// 誠實立場: 純派彩優化, 唔影響中獎機率
import { useMemo } from 'react';
import { Card } from './Card';
import { WaveBall } from './WaveBall';
import { predictStatic } from '../lib/analyzer';
import { shareProfile } from '../lib/quant';
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
    // 最冷門組合建議: 喺 33-49 大號碼 + 尾0 入面揀 6 個 (避生日/圖案)
    const coldPool = [...new Set([...UNPOPULAR, ...Array.from({ length: 49 }, (_, i) => i + 1).filter(n => n % 10 === 0)])];
    const suggested = coldPool.slice(0, 6).sort((a, b) => a - b);
    return { main6, prof, suggested };
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

      <div className="hitrate-summary">
        <span>🎂 生日號（≤31，多人買）：<b>{analysis.prof.birthdayCount}/6</b></span>
        <span>0️⃣ 尾0 號碼：<b>{analysis.prof.tailZero}</b></span>
        <span>🔢 大號碼（33-49，少人買）：<b>{analysis.prof.bigCount}/6</b></span>
      </div>

      <div className="gen-note">
        💡 <b>原理：</b>六合彩頭二三獎係<b>彩池分賬</b> — 中獎人數越少，每注分得越多。大眾傾向買生日號（1-31）、圖案號（對角線/等差），所以 <b>33-49 大號碼 + 尾0</b> 相對少人揀。揀呢類號碼，中獎時獨中/少人分嘅機會高啲。
        <br />🖤 <b>最冷門組合建議：</b>{analysis.suggested.join('、')}（全部 33-49 / 尾0）— 純派彩優化例子。
        <br />⚠️ <b>誠實警告：</b>呢個<b>唔影響中獎機率</b>（每期獨立，1/13,983,816 唔變），只係影響「中獎後分到幾多」。分獎人數極難預測，實際效果有限 — 唔好為咗「冷門」揀啲你冇感覺嘅號碼。
      </div>
    </Card>
  );
}
