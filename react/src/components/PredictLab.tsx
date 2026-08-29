// 預測實驗室 — 新增預測功能集中地: 特別號 / 隔期關聯 / 組合形狀 / 注碼分配 / 隨機性檢定 / 分享風險
import { SpecialPredict } from './SpecialPredict';
import { TransitionBoard } from './TransitionBoard';
import { ShapeScore } from './ShapeScore';
import { BudgetPlanner } from './BudgetPlanner';
import { RandomnessAuditor } from './RandomnessAuditor';
import { ShareRisk } from './ShareRisk';
import type { DashboardData, Draw } from '../lib/analyzer';

interface Props {
  data: DashboardData;
  history: Draw[];
}

export function PredictLab({ data, history }: Props) {
  return (
    <div className="gen-wrap">
      <SpecialPredict data={data} history={history} />
      <TransitionBoard history={history} />
      <ShapeScore history={history} />
      <RandomnessAuditor history={history} />
      <ShareRisk data={data} />
      <BudgetPlanner />
    </div>
  );
}
