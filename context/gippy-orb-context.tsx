'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface GippyOrbContextValue {
  orbActive: boolean;
  beginnerSortActive: boolean;
  yieldSortActive: boolean;
  highlightedCfaId: string | null;
  tourCfaIds: string[];
  tourCfaContext: string;
  startTour: () => void;
  closeOrb: () => void;
  setHighlightedCfaId: (id: string | null) => void;
  setTourCfaIds: (ids: string[]) => void;
  setTourCfaContext: (ctx: string) => void;
  triggerYieldSort: () => void;
  resetYieldSort: () => void;
}

const GippyOrbContext = createContext<GippyOrbContextValue>({
  orbActive: false,
  beginnerSortActive: false,
  yieldSortActive: false,
  highlightedCfaId: null,
  tourCfaIds: [],
  tourCfaContext: '',
  startTour: () => {},
  closeOrb: () => {},
  setHighlightedCfaId: () => {},
  setTourCfaIds: () => {},
  setTourCfaContext: () => {},
  triggerYieldSort: () => {},
  resetYieldSort: () => {},
});

export function GippyOrbProvider({ children }: { children: ReactNode }) {
  const [orbActive, setOrbActive] = useState(false);
  const [beginnerSortActive, setBeginnerSortActive] = useState(false);
  const [yieldSortActive, setYieldSortActive] = useState(false);
  const [highlightedCfaId, setHighlightedCfaId] = useState<string | null>(null);
  const [tourCfaIds, setTourCfaIds] = useState<string[]>([]);
  const [tourCfaContext, setTourCfaContext] = useState('');

  const startTour = useCallback(() => {
    setOrbActive(true);
    setBeginnerSortActive(true);
    setYieldSortActive(false);
    setTourCfaIds([]);
    setTourCfaContext('');
    setHighlightedCfaId(null);
  }, []);

  const closeOrb = useCallback(() => {
    setOrbActive(false);
    setBeginnerSortActive(false);
    setYieldSortActive(false);
    setHighlightedCfaId(null);
    setTourCfaIds([]);
    setTourCfaContext('');
  }, []);

  const triggerYieldSort = useCallback(() => {
    setYieldSortActive(true);
    setTourCfaIds([]); // clear so GippyOrb polls until CfaCards repopulates
  }, []);

  const resetYieldSort = useCallback(() => {
    setYieldSortActive(false);
  }, []);

  return (
    <GippyOrbContext.Provider value={{
      orbActive,
      beginnerSortActive,
      yieldSortActive,
      highlightedCfaId,
      tourCfaIds,
      tourCfaContext,
      startTour,
      closeOrb,
      setHighlightedCfaId,
      setTourCfaIds,
      setTourCfaContext,
      triggerYieldSort,
      resetYieldSort,
    }}>
      {children}
    </GippyOrbContext.Provider>
  );
}

export const useGippyOrb = () => useContext(GippyOrbContext);
