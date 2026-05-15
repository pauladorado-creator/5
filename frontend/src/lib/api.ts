import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export function recipeImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  // backend exposes static at /api/static/...
  return `${BASE}${path}`;
}

export const COLORS = {
  white: "#FFFFFF",
  gray: "rgb(230,230,230)",
  grayLight: "rgb(242,242,242)",
  text: "#1A1A1A",
  textSoft: "#555555",
  black: "#000000",
};

export const LOGO_URL = "https://customer-assets.emergentagent.com/job_82473c81-dafc-4adc-b4cd-0b023c12dd7a/artifacts/kple6ezk_FRIGO-%20LOGO.png";
export const FRIDGE_URL = "https://customer-assets.emergentagent.com/job_82473c81-dafc-4adc-b4cd-0b023c12dd7a/artifacts/8g0yzxvf_frigowebinicio.jpg";

export const MAGNETS: Record<string, string> = {
  "Andalucía": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/wyybhfc5_ANDALUCIA%20IMAN.png",
  "Aragón": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/wwttan90_ARAGON.png",
  "Asturias": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/duajdjh0_asturias.png",
  "Baleares": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/g0n45mhi_bareal.png",
  "Canarias": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/hj0gex3l_gran%20canarias.png",
  "Cantabria": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/qo8vmfuh_cantabria%20iman.png",
  "Castilla-La Mancha": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/twp2zbqv_castilla%20la%20mancha.png",
  "Castilla y León": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/w0fgu3va_castilla%20y%20leon.png",
  "Cataluña": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/vudp09mi_barcelona.png",
  "Comunidad Valenciana": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/pl7rnyry_valencia.png",
  "Extremadura": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/moder595_EXTREMADURA.png",
  "Galicia": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/zto6joxr_galicia.png",
  "La Rioja": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/hn7ecab4_IMAN%20LA%20RIOJA%20CERAMICA.png",
  "Madrid": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/otgdit7g_madrid2.png",
  "Murcia": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/pzohg3h7_murcia.png",
  "Navarra": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/9usw4pah_navarra%20iman_.png",
  "País Vasco": "https://customer-assets.emergentagent.com/job_frigo-recipes-3/artifacts/rqt5c1sy_pais%20vasco.png",
};

export type User = { id: string; email: string; username: string; magnets: string[]; created_at: string };
export type IntoleranceMode = "hide" | "warn" | "substitute";
export type Recipe = {
  id: string; nombre: string; ccaa: string; tiempo: string; dificultad: string;
  raciones: string; temporada: string; descripcion: string;
  precio?: number; favoritos?: number; image_url?: string;
  ingredientes: string[]; preparacion: string[];
  alergenos: { gluten: boolean; lactosa: boolean; frutos_secos: boolean; apto_vegano: boolean };
};
export type CartItem = { name: string; quantity: number; recipe_name?: string; kind?: "recipe" | "personal" };

async function req(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `HTTP ${r.status}`);
  }
  return r.json();
}

export const api = {
  register: (code: string, email: string, username: string) =>
    req("/auth/register", { method: "POST", body: JSON.stringify({ code, email, username }) }),
  login: (email: string) => req("/auth/login", { method: "POST", body: JSON.stringify({ email }) }),
  getUser: (id: string) => req(`/user/${id}`),
  listRecipes: (q: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
    const qs = params.toString();
    return req(`/recipes${qs ? `?${qs}` : ""}`);
  },
  getRecipe: (id: string) => req(`/recipes/${id}`),
  getCCAA: () => req("/ccaa"),
  earnMagnet: (user_id: string, ccaa: string, photo_base64?: string) =>
    req("/magnets/earn", { method: "POST", body: JSON.stringify({ user_id, ccaa, photo_base64 }) }),
  cookRecipe: (recipe_id: string, user_id: string, photo_base64: string) =>
    req(`/recipes/${recipe_id}/cook`, { method: "POST", body: JSON.stringify({ user_id, photo_base64 }) }),
  getCooked: (user_id: string) => req(`/user/${user_id}/cooked`),
  getCookedPhoto: (user_id: string, recipe_id: string) =>
    req(`/user/${user_id}/cooked/${recipe_id}`),
  getCart: (user_id: string) => req(`/cart/${user_id}`),
  updateCart: (user_id: string, items: { name: string; quantity: number }[]) =>
    req("/cart", { method: "POST", body: JSON.stringify({ user_id, items }) }),
  chatSend: (session_id: string, message: string) =>
    req("/chat/message", { method: "POST", body: JSON.stringify({ session_id, message }) }),
  chatHistory: (session_id: string) => req(`/chat/${session_id}`),
};

export async function getStoredUser(): Promise<User | null> {
  const raw = await storage.getItem<string>("frigo_user", "");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
export async function setStoredUser(u: User | null) {
  if (u) await storage.setItem("frigo_user", JSON.stringify(u));
  else await storage.removeItem("frigo_user");
}
