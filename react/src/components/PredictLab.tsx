// 預測實驗室 — 新增預測功能集中地: 特別號預測 / 隔期關聯 / 組合形狀 / 注碼分配
import { SpecialPredict } from './SpecialPredict';
import { TransitionBoard } from './TransitionBoard';
import { ShapeScore } from './ShapeScore';
import { BudgetPlanner } from './BudgetPlanner';
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
      <BudgetPlanner />
    </div>
  );
}
