import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BRDMissingTest, DashboardSummary, SyncStatusPayload, SyncStatusRow } from '../types/dashboard';

export function useSyncStatus() {
  const [data, setData] = useState<SyncStatusPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAttemptedAt, setLastRefreshAttemptedAt] = useState('');
  const [lastSuccessfulRefreshAt, setLastSuccessfulRefreshAt] = useState('');

  const load = useCallback(async (refresh = false) => {
    try {
      const attemptedAt = new Date().toISOString();
      setLastRefreshAttemptedAt(attemptedAt);
      setError('');
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch('/sync-status.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Unable to load sync status (${response.status})`);
      }

      const contentType = response.headers.get('content-type') || '';
      const raw = await response.text();
      if (!contentType.includes('application/json')) {
        throw new Error('Sync status file is missing or invalid. Run: npm run sync:status');
      }

      const payload = JSON.parse(raw) as SyncStatusPayload;
      const normalizedPayload: SyncStatusPayload = {
        ...payload,
        results: (payload.results || []).map(row => {
          const existingCases = (row.testCases || [])
            .map(testCase => ({
              id: String(testCase.id || '').trim(),
              description: String(testCase.description || '').trim(),
            }))
            .filter(testCase => testCase.id.length > 0);

          const fallbackCases = existingCases.length > 0
            ? existingCases
            : row.testCaseId
              ? [{ id: row.testCaseId, description: row.requirement }]
              : [];

          return {
            ...row,
            testCases: fallbackCases,
            testCaseId: fallbackCases[0]?.id || row.testCaseId,
          };
        }),
      };

      setData(normalizedPayload);
      setLastSuccessfulRefreshAt(attemptedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const failingRows = useMemo<SyncStatusRow[]>(() => {
    return (data?.results || []).filter(item => item.status === 'failing');
  }, [data]);

  const brdsMissingTests = useMemo<BRDMissingTest[]>(() => {
    return (data?.results || [])
      .filter(row => !row.hasGeneratedTest)
      .map(row => ({
        brdId: row.brdId,
        requirement: row.requirement,
        testCaseId: row.testCaseId,
        hasTestPlan: row.hasTestPlan,
      }));
  }, [data]);

  const summary = useMemo<DashboardSummary>(() => {
    const total = data?.results.length || 0;
    const failing = failingRows.length;
    return {
      total,
      failing,
      passing: total - failing,
    };
  }, [data, failingRows]);

  return {
    data,
    error,
    loading,
    refreshing,
    failingRows,
    brdsMissingTests,
    lastRefreshAttemptedAt,
    lastSuccessfulRefreshAt,
    summary,
    refresh: () => load(true),
  };
}
