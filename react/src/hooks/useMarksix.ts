// 數據 hooks — TanStack Query: 自動 cache + retry + 雙 mode fallback
import { useQuery } from '@tanstack/react-query';
import { analyzeStatic, predictStatic } from '../lib/analyzer';
import type { DashboardData, Draw, PredictResult } from '../lib/analyzer';

// 嘗試 API, 失敗自動 fallback 去 static 分析
async function loadDashboard(): Promise<DashboardData> {
  try {
    const r = await fetch('/api/dashboard');
    if (!r.ok) throw new Error('api 404');
    return await r.json();
  } catch {
    const raw = await (await fetch('history_full.json', { cache: 'no-store' })).json() as Draw[];
    return analyzeStatic(raw);
  }
}

async function loadPrediction(): Promise<PredictResult> {
  try {
    const r = await fetch('/api/predict');
    if (!r.ok) throw new Error('api 404');
    return await r.json();
  } catch {
    const d = await loadDashboard();
    return predictStatic(d);
  }
}

async function loadHistory(): Promise<Draw[]> {
  try {
    // 攞晒全部期數 (3412期) — 前端篩選用
    const r = await fetch('/api/history?n=5000');
    if (!r.ok) throw new Error('api 404');
    const d = await r.json();
    if (d.draws && d.draws.length > 0) return d.draws;
    throw new Error('empty');
  } catch {
    const raw = await (await fetch('history_full.json', { cache: 'no-store' })).json() as Draw[];
    return raw;
  }
}

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: loadDashboard, staleTime: 60_000, retry: 1 });
}

export function usePrediction() {
  return useQuery({ queryKey: ['predict'], queryFn: loadPrediction, staleTime: 60_000, retry: 1 });
}

export function useHistory() {
  return useQuery({ queryKey: ['history', 'all'], queryFn: loadHistory, staleTime: 60_000, retry: 1 });
}
