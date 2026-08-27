// 數據 hooks — GitHub Pages 純 static mode (冇 backend)
// 直接讀 history_full.json → 前端分析引擎 (analyzeStatic / predictStatic)
import { useQuery } from '@tanstack/react-query';
import { analyzeStatic, predictStatic } from '../lib/analyzer';
import type { DashboardData, Draw, PredictResult } from '../lib/analyzer';

// module-level memo: 3 個 hooks (dashboard/predict/history) 共用同一份 raw fetch
// 唔會首頁 load 3 次 history_full.json (300KB)
let rawCache: Promise<Draw[]> | null = null;

async function loadRaw(): Promise<Draw[]> {
  if (!rawCache) {
    rawCache = fetch('history_full.json', { cache: 'no-store' })
      .then(async r => {
        if (!r.ok) throw new Error(`history_full.json ${r.status}`);
        return await r.json() as Draw[];
      })
      .catch(e => { rawCache = null; throw e; });  // 失敗重置, 等 retry 再試
  }
  return rawCache;
}

async function loadDashboard(): Promise<DashboardData> {
  return analyzeStatic(await loadRaw());
}

async function loadPrediction(): Promise<PredictResult> {
  const d = await loadDashboard();
  return predictStatic(d);
}

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: loadDashboard, staleTime: 60_000, retry: 1 });
}

export function usePrediction() {
  return useQuery({ queryKey: ['predict'], queryFn: loadPrediction, staleTime: 60_000, retry: 1 });
}

export function useHistory() {
  return useQuery({ queryKey: ['history', 'all'], queryFn: loadRaw, staleTime: 60_000, retry: 1 });
}
