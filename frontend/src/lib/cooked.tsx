import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api, getStoredUser } from "@/src/lib/api";

type Ctx = {
  cookedIds: Set<string>;
  reload: () => Promise<void>;
  addCooked: (recipeId: string) => void;
};

const CookedContext = createContext<Ctx>({
  cookedIds: new Set(),
  reload: async () => {},
  addCooked: () => {},
});

export function CookedProvider({ children }: { children: ReactNode }) {
  const [cookedIds, setCookedIds] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    const u = await getStoredUser();
    if (!u) {
      setCookedIds(new Set());
      return;
    }
    try {
      const res = await api.getCooked(u.id);
      setCookedIds(new Set(res.recipe_ids || []));
    } catch {
      // ignore
    }
  }, []);

  const addCooked = useCallback((recipeId: string) => {
    setCookedIds(prev => {
      const next = new Set(prev);
      next.add(recipeId);
      return next;
    });
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <CookedContext.Provider value={{ cookedIds, reload, addCooked }}>
      {children}
    </CookedContext.Provider>
  );
}

export function useCooked() {
  return useContext(CookedContext);
}
