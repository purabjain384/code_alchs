'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AuthUser,
  DailyCareTask,
  EvaluateVisitApiResponse,
  MotherRecord,
  SosDispatchRecord,
} from '@/types';
import {
  bulkImportDatasetMothers,
  createNewMother,
  evaluateAncVisit,
  EvaluateVisitPayload,
  fetchAllMothers,
  fetchSosDispatches,
  updateMotherDailyTasks,
} from '@/lib/api';

interface AppContextValue {
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  mothers: MotherRecord[];
  sosDispatches: SosDispatchRecord[];
  offlineQueue: EvaluateVisitPayload[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  registerMother: (payload: Partial<MotherRecord>) => Promise<MotherRecord>;
  recordVisit: (payload: EvaluateVisitPayload) => Promise<{
    queuedOffline: boolean;
    response?: EvaluateVisitApiResponse;
  }>;
  syncOfflineQueue: () => Promise<number>;
  importDatasetRows: (rows: Array<Record<string, unknown>>) => Promise<MotherRecord[]>;
  saveDailyTasks: (motherId: string, tasks: DailyCareTask[]) => Promise<void>;
  activeMotherId: string | null;
  setActiveMotherId: (id: string | null) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const USER_STORAGE_KEY = 'matruraksha_auth_user_v1';
const OFFLINE_QUEUE_KEY = 'matruraksha_offline_visits_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [mothers, setMothers] = useState<MotherRecord[]>([]);
  const [sosDispatches, setSosDispatches] = useState<SosDispatchRecord[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<EvaluateVisitPayload[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeMotherId, setActiveMotherId] = useState<string | null>(null);

  const setCurrentUser = useCallback((user: AuthUser | null) => {
    setCurrentUserState(user);
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        if (user.mother_id) {
          setActiveMotherId(user.mother_id);
        }
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, [setCurrentUser]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedMothers, fetchedSos] = await Promise.all([
        fetchAllMothers(),
        fetchSosDispatches().catch(() => []),
      ]);
      setMothers(fetchedMothers);
      setSosDispatches(fetchedSos);
      if (fetchedMothers.length > 0 && !activeMotherId) {
        setActiveMotherId(fetchedMothers[0].id);
      }
    } catch (err) {
      console.warn('Backend fetch warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeMotherId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser) as AuthUser;
          setCurrentUserState(parsed);
          if (parsed.mother_id) setActiveMotherId(parsed.mother_id);
        } catch {
          // ignore
        }
      }
      const savedQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (savedQueue) {
        try {
          setOfflineQueue(JSON.parse(savedQueue));
        } catch {
          // ignore
        }
      }
    }
    refreshData();
  }, [refreshData]);

  const registerMother = useCallback(async (payload: Partial<MotherRecord>) => {
    const created = await createNewMother(payload);
    setMothers((prev) => [created, ...prev.filter((m) => m.id !== created.id)]);
    setActiveMotherId((prev) => prev || created.id);
    return created;
  }, []);

  const recordVisit = useCallback(async (payload: EvaluateVisitPayload) => {
    try {
      const response = await evaluateAncVisit(payload);
      if (response.mother_record) {
        setMothers((prev) => {
          const updated = [
            response.mother_record!,
            ...prev.filter((m) => m.id !== response.mother_record!.id),
          ];
          const priority = { HIGH: 0, MODERATE: 1, LOW: 2 };
          return updated.sort(
            (a, b) => priority[a.riskLevel] - priority[b.riskLevel]
          );
        });
      } else {
        await refreshData();
      }
      return { queuedOffline: false, response };
    } catch {
      // Save to offline queue if backend is unreachable
      setOfflineQueue((prev) => {
        const next = [...prev, payload];
        if (typeof window !== 'undefined') {
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));
        }
        return next;
      });
      return { queuedOffline: true };
    }
  }, [refreshData]);

  const syncOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0) return 0;
    let syncedCount = 0;
    const remaining: EvaluateVisitPayload[] = [];
    for (const item of offlineQueue) {
      try {
        await evaluateAncVisit(item);
        syncedCount += 1;
      } catch {
        remaining.push(item);
      }
    }
    setOfflineQueue(remaining);
    if (typeof window !== 'undefined') {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    }
    await refreshData();
    return syncedCount;
  }, [offlineQueue, refreshData]);

  const importDatasetRows = useCallback(async (rows: Array<Record<string, unknown>>) => {
    const imported = await bulkImportDatasetMothers(rows);
    await refreshData();
    return imported;
  }, [refreshData]);

  const saveDailyTasks = useCallback(async (motherId: string, tasks: DailyCareTask[]) => {
    setMothers((prev) =>
      prev.map((m) => (m.id === motherId ? { ...m, dailyTasks: tasks } : m))
    );
    await updateMotherDailyTasks(motherId, tasks);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        mothers,
        sosDispatches,
        offlineQueue,
        isLoading,
        refreshData,
        registerMother,
        recordVisit,
        syncOfflineQueue,
        importDatasetRows,
        saveDailyTasks,
        activeMotherId,
        setActiveMotherId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside <AppProvider>');
  }
  return ctx;
}

