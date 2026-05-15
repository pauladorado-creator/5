// Ingredient substitution dictionary for "modificar recetas por intolerancia" mode.
// Each key is a lowercase substring matcher; value is the replacement.

type Subs = Record<string, string>;

const GLUTEN_SUBS: Subs = {
  "pan rallado": "pan rallado sin gluten",
  "miga de pan": "miga de pan sin gluten",
  "rebanadas de pan": "rebanadas de pan sin gluten",
  "pan duro": "pan duro sin gluten",
  "pan del día anterior": "pan sin gluten del día anterior",
  "pan de hogaza": "pan de hogaza sin gluten",
  "pan blanco candeal": "pan sin gluten",
  "rebanada de pan": "rebanada de pan sin gluten",
  "pan ": "pan sin gluten ",
  "harina de trigo": "harina sin gluten",
  "harina de fuerza": "harina sin gluten para panificación",
  "harina": "harina sin gluten",
  "fideos": "fideos sin gluten",
  "pasta": "pasta sin gluten",
  "placas de canelones": "placas de canelones sin gluten",
  "galets": "galets sin gluten",
  "caracolas": "caracolas sin gluten",
  "chorizo": "chorizo sin gluten certificado",
  "morcilla": "morcilla sin gluten certificada",
  "sobrasada": "sobrasada sin gluten",
  "butifarra": "butifarra sin gluten",
  "salsa de soja": "tamari (soja sin gluten)",
  "cerveza": "cerveza sin gluten",
};

const LACTOSE_SUBS: Subs = {
  "leche entera": "bebida vegetal (avena o soja)",
  "leche condensada": "leche condensada sin lactosa",
  "leche": "leche sin lactosa",
  "nata": "nata vegetal o sin lactosa",
  "queso parmesano": "queso vegano rallado",
  "queso emmental": "queso vegano para fundir",
  "queso rallado": "queso vegano rallado",
  "queso": "queso sin lactosa",
  "mantequilla": "margarina vegetal",
  "manteca de cerdo": "manteca vegetal",
  "yema": "yema (sin lactosa)",
};

const NUTS_SUBS: Subs = {
  "almendra molida": "harina de coco (evita frutos secos)",
  "almendra": "evitar (frutos secos)",
  "almendras": "evitar (frutos secos)",
  "avellanas": "evitar (frutos secos)",
  "nueces": "evitar (frutos secos)",
  "pistachos": "evitar (frutos secos)",
};

const VEGAN_SUBS: Subs = {
  "jamón serrano": "jamón vegano (seitán curado)",
  "jamón ibérico": "jamón vegano",
  "jamón": "jamón vegano",
  "panceta": "panceta vegana (tempeh ahumado)",
  "tocino": "tocino vegano",
  "chorizo": "chorizo vegano",
  "morcilla": "morcilla vegana de arroz",
  "butifarra": "butifarra vegana",
  "sobrasada": "sobrasada vegana",
  "pollo": "seitán o tofu",
  "ternera": "soja texturizada",
  "cerdo": "soja texturizada",
  "cordero": "seitán especiado",
  "carrillada": "seitán a la brasa",
  "carrilleras": "seitán a la brasa",
  "carne picada": "soja texturizada fina",
  "bonito del norte": "tofu marinado",
  "bonito": "tofu marinado",
  "atún": "tofu marinado",
  "bacalao": "tofu marinado en algas",
  "trucha": "tofu marinado",
  "sepia": "setas king oyster",
  "calamar": "setas king oyster",
  "chipirones": "setas king oyster",
  "gambas": "champiñón laminado",
  "almejas": "alga wakame",
  "pescado": "tofu marinado",
  "cherne": "tofu marinado",
  "huevo cocido": "tofu salteado",
  "huevos": "huevo veggie (en polvo o tofu)",
  "huevo": "huevo veggie",
  "yema": "yema vegana (cúrcuma + aquafaba)",
  "leche": "bebida vegetal",
  "nata": "nata vegetal",
  "queso": "queso vegano",
  "mantequilla": "margarina vegetal",
  "manteca de cerdo": "manteca vegetal",
};

export type SubMode = {
  gluten?: boolean;
  lactose?: boolean;
  nuts?: boolean;
  vegan?: boolean;
};

function applyDict(line: string, dict: Subs): { changed: boolean; line: string } {
  let result = line;
  let changed = false;
  const lower = result.toLowerCase();
  for (const key of Object.keys(dict).sort((a, b) => b.length - a.length)) {
    const idx = lower.indexOf(key);
    if (idx !== -1) {
      // Preserve case-insensitive replacement.
      const re = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      result = result.replace(re, dict[key]);
      changed = true;
      break; // one substitution per line is enough
    }
  }
  return { changed, line: result };
}

export function substituteIngredient(ingredient: string, mode: SubMode): { changed: boolean; line: string } {
  let cur = { changed: false, line: ingredient };
  if (mode.gluten) {
    const r = applyDict(cur.line, GLUTEN_SUBS);
    if (r.changed) cur = { changed: true, line: r.line };
  }
  if (mode.lactose) {
    const r = applyDict(cur.line, LACTOSE_SUBS);
    if (r.changed) cur = { changed: true, line: r.line };
  }
  if (mode.nuts) {
    const r = applyDict(cur.line, NUTS_SUBS);
    if (r.changed) cur = { changed: true, line: r.line };
  }
  if (mode.vegan) {
    const r = applyDict(cur.line, VEGAN_SUBS);
    if (r.changed) cur = { changed: true, line: r.line };
  }
  return cur;
}

export function allergenLabels(a: { gluten: boolean; lactosa: boolean; frutos_secos: boolean }): string[] {
  const out: string[] = [];
  if (a.gluten) out.push("gluten");
  if (a.lactosa) out.push("lactosa");
  if (a.frutos_secos) out.push("frutos secos");
  return out;
}
