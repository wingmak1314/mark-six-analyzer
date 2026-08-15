// 數據 hooks — GitHub Pages 純 static mode (冇 backend, 唔會試 /api)
// 直接讀 history_full.json → 前端分析引擎 (analyzeStatic / predictStatic)
import { useQuery } from '@tanstack/react-query';
import { analyzeStatic, predictStatic } from '../lib/analyzer';
import type { DashboardData, Draw, PredictResult } from '../lib/analyzer';

async function loadRaw(): Promise<Draw[]> {
  const r = await fetch('history_full.json', { cache: 'no-store' });
  if (!r.ok) throw new Error(`history_full.json ${r.status}`);
  return await r.json() as Draw[];
}

async function loadDashboard(): Promise<DashboardData> {
  const raw = await loadRaw();
  return analyzeStatic(raw);
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
