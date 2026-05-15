# FRIGO - PRD

App móvil Expo de recetas españolas por Comunidades Autónomas con sistema de imanes de recompensa.

## Funcionalidades MVP
- **Splash**: foto nevera, logo FRIGO, swipe up para entrar (si registrado), botones Login/Registro si no.
- **Auth**: registro con código 0000 + email + username; login solo con email. Persistencia en AsyncStorage.
- **Para ti**: recetas filtradas por temporada actual (con productos de temporada).
- **Explorar**: cuadrícula de 19 Comunidades Autónomas; entrar muestra recetas de esa CCAA.
- **Detalle receta**: ingredientes, preparación, alérgenos; botón "Añadir a la cesta".
- **Chat IA**: Claude Sonnet 4.5 vía Emergent Universal Key — asistente culinario español.
- **Cesta de compra**: lista de ingredientes persistente en backend.
- **Imanes**: usuario gana iman de CCAA al visitarla (icono cinta). Imanes: Aragón, Asturias, Cataluña, Cantabria, Extremadura.
- **Notificaciones flotantes** dismissables: filtros alergenos y subida fotos.
- **Filtros**: gluten, lactosa, frutos secos, vegano.
- **Ordenar**: alfabético asc/desc.

## Tech
- Backend FastAPI + MongoDB (38 recetas seedeadas del recetario PDF).
- Frontend Expo Router + AsyncStorage.
- Diseño minimalista: blanco, gris 230, gris 242. Iconos @expo/vector-icons (sin emojis).
