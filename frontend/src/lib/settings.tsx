import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { storage } from "@/src/utils/storage";
import { IntoleranceMode } from "@/src/lib/api";

export type SortBy = "alphabetical" | "difficulty" | "time" | "price" | "favorites";

export type Filters = {
  exclude_gluten: boolean;
  exclude_lactose: boolean;
  exclude_nuts: boolean;
  vegan: boolean;
  mode: IntoleranceMode;  // hide | warn | substitute
};

export type SortPref = { by: SortBy; asc: boolean };

const DEFAULT_FILTERS: Filters = {
  exclude_gluten: false,
  exclude_lactose: false,
  exclude_nuts: false,
  vegan: false,
  mode: "hide",
};

const DEFAULT_SORT: SortPref = { by: "alphabetical", asc: true };

type Ctx = {
  filters: Filters;
  sort: SortPref;
  setFilters: (f: Filters) => void;
  setSort: (s: SortPref) => void;
};

const SettingsContext = createContext<Ctx>({
  filters: DEFAULT_FILTERS,
  sort: DEFAULT_SORT,
  setFilters: () => {},
  setSort: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSortState] = useState<SortPref>(DEFAULT_SORT);

  useEffect(() => {
    (async () => {
      try {
        const f = await storage.getItem<string>("frigo_filters", "");
        if (f) setFiltersState({ ...DEFAULT_FILTERS, ...JSON.parse(f) });
        const s = await storage.getItem<string>("frigo_sort", "");
        if (s) setSortState({ ...DEFAULT_SORT, ...JSON.parse(s) });
      } catch {}
    })();
  }, []);

  const setFilters = useCallback((f: Filters) => {
    setFiltersState(f);
    storage.setItem("frigo_filters", JSON.stringify(f));
  }, []);

  const setSort = useCallback((s: SortPref) => {
    setSortState(s);
    storage.setItem("frigo_sort", JSON.stringify(s));
  }, []);

  return (
    <SettingsContext.Provider value={{ filters, sort, setFilters, setSort }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function sortRecipes<T extends { nombre: string; dificultad: string; tiempo: string; precio?: number; favoritos?: number }>(
  arr: T[],
  pref: SortPref
): T[] {
  const out = [...arr];
  const dir = pref.asc ? 1 : -1;
  const diffOrder: Record<string, number> = { Fácil: 1, "Fácil ": 1, Media: 2, Difícil: 3, Alta: 3 };
  const parseTime = (t: string) => {
    // try to extract first number group; treat "h" as 60.
    const lower = t.toLowerCase();
    const hMatch = lower.match(/(\d+)\s*h/);
    const mMatch = lower.match(/(\d+)\s*(?:min|´|')/);
    const h = hMatch ? parseInt(hMatch[1], 10) * 60 : 0;
    const m = mMatch ? parseInt(mMatch[1], 10) : 0;
    if (h || m) return h + m;
    const any = lower.match(/(\d+)/);
    return any ? parseInt(any[1], 10) : 9999;
  };
  out.sort((a, b) => {
    let cmp = 0;
    switch (pref.by) {
      case "alphabetical":
        cmp = a.nombre.localeCompare(b.nombre, "es");
        break;
      case "difficulty":
        cmp = (diffOrder[a.dificultad] || 99) - (diffOrder[b.dificultad] || 99);
        break;
      case "time":
        cmp = parseTime(a.tiempo) - parseTime(b.tiempo);
        break;
      case "price":
        cmp = (a.precio || 0) - (b.precio || 0);
        break;
      case "favorites":
        cmp = (a.favoritos || 0) - (b.favoritos || 0);
        break;
    }
    return cmp * dir;
  });
  return out;
}
