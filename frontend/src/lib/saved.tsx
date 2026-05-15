import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api, getStoredUser, Recipe } from "@/src/lib/api";

type Ctx = {
  savedIds: Set<string>;
  saved: Recipe[];
  reload: () => Promise<void>;
  toggle: (recipeId: string) => Promise<boolean>;  // returns new state (true=saved)
};

const SavedContext = createContext<Ctx>({
  savedIds: new Set(),
  saved: [],
  reload: async () => {},
  toggle: async () => false,
});

export function SavedProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Recipe[]>([]);

  const reload = useCallback(async () => {
    const u = await getStoredUser();
    if (!u) {
      setSavedIds(new Set());
      setSaved([]);
      return;
    }
    try {
      const res = await api.getSaved(u.id);
      setSavedIds(new Set(res.recipe_ids || []));
      setSaved(res.recipes || []);
    } catch {}
  }, []);

  const toggle = useCallback(async (recipeId: string) => {
    const u = await getStoredUser();
    if (!u) return false;
    if (savedIds.has(recipeId)) {
      await api.unsaveRecipe(u.id, recipeId);
      setSavedIds(prev => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
      setSaved(prev => prev.filter(r => r.id !== recipeId));
      return false;
    } else {
      await api.saveRecipe(u.id, recipeId);
      setSavedIds(prev => {
        const next = new Set(prev);
        next.add(recipeId);
        return next;
      });
      // refresh full list in background
      reload();
      return true;
    }
  }, [savedIds, reload]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <SavedContext.Provider value={{ savedIds, saved, reload, toggle }}>
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved() {
  return useContext(SavedContext);
}
