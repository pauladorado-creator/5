#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  FRIGO recipe app. New iteration: implement Splash screen full-bleed fridge image with small
  FRIGO logo (no background), draggable collectible magnets per CCAA (only shown when earned),
  recipe photo upload to mark recipes as "cooked", and auto-award CCAA magnet when all recipes
  of that CCAA are cooked by the user. Map 15 magnet assets to their CCAA. Spanish locale.

backend:
  - task: "Cook recipe endpoint (POST /api/recipes/{id}/cook) with photo + magnet auto-award"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "New endpoint: stores cooked recipe (user_id, recipe_id, ccaa, base64 photo), counts cooked vs total recipes for that CCAA, and adds CCAA to user.magnets when all recipes are cooked. Returns awarded_magnet flag."
        -working: true
        -agent: "testing"
        -comment: "Verified end-to-end on live preview URL. Murcia has 3 recipes; cooking #1 and #2 returned awarded_magnet=false with cooked_in_ccaa=1 then 2; the 3rd cook returned awarded_magnet=true, ccaa='Murcia', magnets=['Murcia']. Repeating the same cook call is idempotent (cooked_in_ccaa stays at 3, total_in_ccaa=3, no duplicate magnet). 404 paths return Spanish error messages."

  - task: "Get cooked recipes for user (GET /api/user/{id}/cooked)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Returns recipe_ids list and items (photo omitted) so frontend can mark recipes as done."
        -working: true
        -agent: "testing"
        -comment: "Confirmed recipe_ids array contains all 3 Murcia recipe ids after cooking them. Items array is returned without the photo field (only photo omitted, other fields like ccaa/created_at present)."

  - task: "Get a single cooked recipe photo (GET /api/user/{id}/cooked/{recipe_id})"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Returns full cooked doc including base64 photo for the recipe detail screen."
        -working: true
        -agent: "testing"
        -comment: "Returns the cooked document including the base64 photo string (118 chars matching the data URI we sent). 200 OK."

  - task: "Existing auth/recipe/CCAA endpoints (regression)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Register/login/recipes/ccaa/chat unchanged. Need regression validation."
        -working: true
        -agent: "testing"
        -comment: "Regression PASS: POST /auth/register (new user) → 200 with id; POST /auth/login returns the same id; GET /api/ shows 38 recipes seeded; GET /api/ccaa returns 19 entries; GET /api/recipes?ccaa=Murcia returns 3 recipes; GET /api/recipes/{id} → 200; GET /api/user/{id} reflects magnets=['Murcia']; POST /api/chat/message with Emergent LLM key returned a 319-char Spanish answer recommending Zarangollo for summer; POST /api/cart + GET /api/cart/{user_id} round-trip works."

frontend:
  - task: "Splash screen full-bleed fridge + small logo + no default magnets"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Visually verified via screenshot: fridge fills the screen, FRIGO logo small at top with no background, login/register buttons at bottom, no default magnets."

  - task: "Draggable collectible magnets on splash for earned CCAA"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/index.tsx, /app/frontend/src/components/DraggableMagnet.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "DraggableMagnet uses PanResponder, persists position per user/CCAA in AsyncStorage. Splash renders only user.magnets entries with their image."

  - task: "Recipe photo upload + magnet award flow"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/recipe/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Uses expo-image-picker (camera or library), sends base64 to /api/recipes/{id}/cook, shows the photo with overlay magnet + 'Hecha por ti' label and alerts when CCAA magnet awarded."

  - task: "Cooked recipes badge in lists (Para ti + CCAA)"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(app)/parati.tsx, /app/frontend/app/(app)/ccaa/[name].tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "CookedProvider exposes cookedIds via context. Recipe cards show small magnet thumb and checkmark when cooked. CCAA page also shows progress (X/Y) and unlocks the big magnet visual."

  - task: "Magnet asset mapping for 15 CCAA"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/lib/api.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Andalucía, Aragón, Asturias, Baleares, Canarias, Cantabria, Castilla-La Mancha, Castilla y León, Cataluña, Extremadura, Galicia, La Rioja, Madrid, Murcia, Navarra all mapped to user-provided assets."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Cook recipe endpoint (POST /api/recipes/{id}/cook) with photo + magnet auto-award"
    - "Get cooked recipes for user (GET /api/user/{id}/cooked)"
    - "Get a single cooked recipe photo (GET /api/user/{id}/cooked/{recipe_id})"
    - "Existing auth/recipe/CCAA endpoints (regression)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "testing"
    -message: |
      Iter3 quick regression PASS (9/9) on https://frigo-recipes-3.preview.emergentagent.com.
        - GET /api/ → recipes=50 (was 48). Backend reseed log confirms "Reseeded 50 recipes (version 3)".
        - GET /api/recipes?ccaa=Comunidad Valenciana → 3 recipes exactly: Arroz Meloso de Pollo, Fideuà, Arroz a Banda. Each carries image_url string starting with "/api/static/recipes/recipe_".
        - GET /api/static/recipes/recipe_01.jpg → 200, content-type image/jpeg, 156547 bytes. HEAD also 200 image/jpeg.
        - GET /api/static/recipes/recipe_50.jpg → 200, content-type image/jpeg, 472943 bytes.
        - GET /api/ccaa → 17 entries, contains "Comunidad Valenciana", does NOT contain "Ceuta" or "Melilla". Full list: ['Andalucía','Aragón','Asturias','Baleares','Canarias','Cantabria','Castilla-La Mancha','Castilla y León','Cataluña','Comunidad Valenciana','Extremadura','Galicia','La Rioja','Madrid','Murcia','Navarra','País Vasco'].
        - GET /api/recipes/{first_id} → 200 with image_url present ("/api/static/recipes/recipe_01.jpg").
        - POST /api/auth/login {"email":"backend.test@frigo.app"} (prior user) → 200, id=d56d3947-…; POST /api/cart with two kind="personal" items round-trips correctly (kind preserved as "personal", recipe_name=None).
      No regressions detected. backend_test.py updated for iter3 checks.
    -agent: "testing"
    -message: |
      Iter2 regression PASS (9/9) on https://frigo-recipes-3.preview.emergentagent.com.
        - GET /api/ → recipes=48 (confirmed reseed from 38→48; backend log shows "Reseeded 48 recipes (version 2)").
        - POST /api/auth/register {code:"0000", email:"iter2.test@frigo.app", username:"iter2"} → 200 (id=c2d42758-...). Fallback to /auth/login implemented but not needed this run.
        - POST /api/cart NEW shape with kind+recipe_name → 200; GET /api/cart/{id} returns BOTH items with kind ("recipe"/"personal") and recipe_name preserved exactly ("Salmorejo Cordobés" / null).
        - POST /api/cart OLD shape {name, quantity} → 200; GET round-trip shows item normalized with kind defaulting to "recipe" and recipe_name=null. Back-compat works (CartItem model has defaults kind="recipe", recipe_name=None).
        - GET /api/recipes?ccaa=Murcia → 3 recipes: Ensalada Murciana, Caldero del Mar Menor, Paparajotes. Each includes precio (float, e.g. 3.25) and favoritos (int, 0). All Murcia recipes validated.
        - POST /api/recipes/{id}/cook with photo on a Murcia recipe → 200, body {ok:true, ccaa:"Murcia", cooked_in_ccaa:1, total_in_ccaa:3, awarded_magnet:false, magnets:[]}. Cook endpoint still works as expected.
      No issues found. backend_test.py updated for iter2 checks.
    -agent: "testing"
    -message: |
      Backend regression + new endpoints all PASS (16/16) on the live preview URL.
      Highlights:
        - Created user backend.test@frigo.app via /api/auth/register (code 0000) and re-logged in.
        - Murcia has 3 recipes. Cooking the 1st and 2nd returned awarded_magnet=false (cooked_in_ccaa=1,2; total=3). Cooking the 3rd returned awarded_magnet=true, ccaa='Murcia', magnets=['Murcia']. Repeating the 3rd cook is idempotent (counts stay 3/3).
        - GET /api/user/{id}/cooked returns all 3 Murcia recipe_ids.
        - GET /api/user/{id}/cooked/{recipe_id} returns the base64 photo (118 chars).
        - GET /api/user/{id} reflects 'Murcia' in magnets.
        - Regression: GET /api/ recipes=38, GET /api/ccaa returns 19 entries, GET /api/recipes/{id} OK, POST /api/chat/message produced a coherent Spanish recommendation ('Zarangollo... perfecto para el verano'), Cart POST + GET round-trip OK.
      No issues found. Frontend testing not attempted (per protocol, do not test FE without user request).
    -agent: "main"
    -message: |
      Implemented photo upload + magnet collection flow. Please regression-test all existing endpoints
      AND validate the new ones:
        1. POST /api/auth/register with { code: "0000", email: "demo@frigo.app", username: "demo" } → 200
        2. POST /api/auth/login with { email: "demo@frigo.app" } → returns the user
        3. GET /api/recipes?ccaa=Murcia → should return >= 2 recipes
        4. For each recipe in CCAA "Murcia": POST /api/recipes/{id}/cook with { user_id, photo_base64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" }.
           - Each call should respond with cooked_in_ccaa increasing, total_in_ccaa equal to the recipe count.
           - The LAST call must set awarded_magnet=true and include "Murcia" in magnets array.
        5. GET /api/user/{user_id}/cooked → recipe_ids should contain all Murcia recipe ids.
        6. GET /api/user/{user_id}/cooked/{recipe_id} → photo field present.
        7. POST /api/chat/message with a Spanish prompt about Spanish recipes → 200 response with text.
      Use test_credentials.md for the registration code. Spanish locale; user-facing errors should be in Spanish.
