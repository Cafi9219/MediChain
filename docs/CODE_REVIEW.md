# MediChain Full-Stack Code Review (`CODE_REVIEW.md`)

> **Scope:** Comprehensive read-only audit of backend performance, frontend performance, security/cleanliness, and maintainability across `/backend` and `/frontend/src`, including real baseline measurements. No application behavior or source code was modified.

---

## ⚠️ Pre-Flight Blocker Check: `GET /api/deadlines`

Before starting `R1–R8`, we checked the running backend for `GET /api/deadlines`:
- **Measured Result:** `GET http://localhost:5000/api/deadlines` → **`HTTP 404 Not Found`** (`16.55 ms`, `152 bytes`).
- **Code Reference:** [`backend/server.js:30-36`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/server.js#L30-L36) currently mounts only 5 route modules (`/api/auth`, `/api/cadavers`, `/api/organs`, `/api/blockchain`, `/api/admin`). There is no `deadlineRoutes.js` or `/api/deadlines` handler in `/backend/routes` yet.
- Per your instructions (*"If GET /api/deadlines does not exist yet, stop and tell me"* and *"First write /docs/CODE_REVIEW.md ... STOP after /docs/CODE_REVIEW.md and ask which items to implement"*), we have stopped before touching any code.

---

## 1. PERFORMANCE (Backend)

### 1.1 Synchronous Full-File Rewrite on Every Transaction (`Blockchain.save()`)
- **Finding:** [`backend/blockchain/blockchain.js:125-135`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/blockchain/blockchain.js#L125-L135) serializes the entire `this.chain` and `this.pendingTransactions` array with pretty-printed indentation (`JSON.stringify(..., null, 2)`) and blocks the Node.js event loop via `fs.writeFileSync(DATA_FILE, ...)` on every single call to `init()` (line 34), `addTransaction()` (line 61), and `minePendingTransactions()` (line 81).
- **Impact:** Every `POST /api/cadavers`, `POST /api/cadavers/:hexId/sign`, `POST /api/organs/harvest`, and `POST /api/organs/reports/:reportId/sign` synchronously rewrites the entire ledger file. Worse, `POST /api/blockchain/simulate-tamper` ([`blockchainRoutes.js:78`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/blockchainRoutes.js#L78)) calls `ledger.init()` on every tamper test, synchronously reading `ledger.json` from disk.
- **Proposed Fix:** Replace synchronous `fs.writeFileSync` with a debounced/batched asynchronous atomic writer (`fs.promises.writeFile` to a `.tmp` file + `fs.promises.rename`, or append-only NDJSON log + periodic snapshot compaction) managed by a unified `store` module.

### 1.2 Unpaginated Endpoints Returning Full Records & Base64 Images
- **Findings:**
  - `GET /api/cadavers` ([`backend/routes/cadaverRoutes.js:193-200`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/cadaverRoutes.js#L193-L200)) returns the entire `cadaverRegistry` array in one payload, including raw base64 Data URLs (`faceImage`, `fingerprint.image`, `retina.image` defined at lines `109-118`).
  - `GET /api/organs/reports` ([`backend/routes/organRoutes.js:203-205`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/organRoutes.js#L203-L205)) and `GET /api/organs/list` ([`organRoutes.js:208-223`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/organRoutes.js#L208-L223)) return all reports and organs unpaginated, including each organ's base64 `qaImage` (`line 143`).
  - [`backend/server.js:21-22`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/server.js#L21-L22) configures `express.json({ limit: '50mb' })` specifically because base64 images are embedded directly inside JSON records. When 10+ cadavers with 3 high-res photos each are registered, `GET /api/cadavers` balloons to tens of megabytes per poll.
- **Proposed Fix (Preserving Backward-Compatible Default Shape):**
  - Support optional query parameters `?view=summary&page=1&limit=20` on `GET /api/cadavers`, `GET /api/organs/reports`, and `GET /api/organs/list` (stripping base64 image blobs in summary mode and replacing them with boolean flags `hasFaceImage: true` + image URLs) while preserving the existing response keys (`{ success, count, cadavers }`, etc.).
  - Add dedicated image endpoints (`GET /api/cadavers/:hexId/media/:field` and `GET /api/organs/:organId/image`) to serve images on demand with `Cache-Control` headers.

### 1.3 Unpaginated `/api/blockchain` Polled Every 10 Seconds
- **Finding:** [`backend/routes/blockchainRoutes.js:31-39`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/blockchainRoutes.js#L31-L39) returns the entire `ledger.chain` and `ledger.pendingTransactions` on every call. Meanwhile, [`frontend/src/App.jsx:23-33`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/App.jsx#L23-L33) calls `fetchBlockchain('ADMIN')` every 10 seconds solely to read `bRes.blockHeight` for the `Navbar` badge!
- **Proposed Fix:**
  - Add pagination (`?page=1&limit=20`) to `GET /api/blockchain` while keeping `chain`, `blockHeight`, `difficulty`, and `pendingTransactions` in the response shape.
  - Use lightweight `/api/health` (which already returns `currentBlockHeight` in `140 bytes` at [`server.js:38-45`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/server.js#L38-L45)) or `?view=summary` for background block-height polling.

### 1.4 In-Memory Arrays Lost on Server Restart (State Desynchronization)
- **Finding:** `cadaverRegistry` ([`cadaverRoutes.js:12-80`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/cadaverRoutes.js#L12-L80)) and `harvestReports` ([`organRoutes.js:23-99`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/organRoutes.js#L23-L99)) are module-scoped in-memory arrays, whereas `ledger.chain` is persisted to [`backend/data/ledger.json`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/data/ledger.json). When the backend restarts, `ledger.json` keeps all mined blocks, but `cadaverRegistry` and `harvestReports` reset to the single hardcoded sample donor (`0x4F8B7A92`).
- **Proposed Fix:** Consolidate `cadaverRegistry`, `harvestReports`, and `ledger` persistence into a single `backend/store/` module with atomic debounced `load()` / `save()` to `backend/data/store.json` and `backend/data/ledger.json`.

### 1.5 Measured Backend Baseline Metrics (Actual Measurements)
Measured against the live backend (`http://localhost:5000`) with Node.js `v24.19.0` (`performance.now()`):

| Endpoint / Operation | HTTP Status | Measured Response / Execution Time | Measured Payload / File Size |
| :--- | :---: | :---: | :---: |
| `GET /api/health` | `200` | `52.67 ms` *(cold first hit)* | `140 bytes` |
| `GET /api/cadavers` *(1 seed record, no base64 images)* | `200` | `6.94 ms` | `2,026 bytes` |
| `GET /api/organs/reports` *(1 seed report, 3 organs)* | `200` | `11.30 ms` | `2,223 bytes` |
| `GET /api/organs/list` *(3 seed organs)* | `200` | `15.00 ms` | `1,593 bytes` |
| `GET /api/blockchain` *(2 blocks)* | `200` | `13.55 ms` | `3,547 bytes` |
| `GET /api/admin/overview` | `200` | `7.68 ms` | `3,478 bytes` |
| `GET /api/auth/doctors` *(9 doctors)* | `200` | `8.19 ms` | `2,358 bytes` |
| `GET /api/deadlines` *(missing route)* | `404` | `16.55 ms` | `152 bytes` |
| `Blockchain.save()` (`JSON.stringify` + `fs.writeFileSync`, 50-run avg) | N/A | `0.600 ms` *(at 2 blocks)* | `4,957 bytes` (`ledger.json`) |

---

## 2. PERFORMANCE (Frontend)

### 2.1 Eager Loading of All Role Dashboards & Modals (Monolithic Bundle)
- **Finding:** [`frontend/src/App.jsx:2-9`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/App.jsx#L2-L9) statically imports `CifvDashboard`, `SropsDashboard`, `AdminDashboard`, `BlockchainExplorer`, `DoctorRosterModal`, and `LoginModal`. A user visiting the landing page downloads the code for every department portal and the blockchain inspector immediately.
- **Measured Baseline Bundle Size (`npm run build` via Vite v6.4.3):**
  - `dist/index.html`: `0.88 kB` (`gzip: 0.50 kB`)
  - `dist/assets/index-DGUQwode.css`: `38.78 kB` (`gzip: 6.79 kB`)
  - `dist/assets/index-DXFqwL6U.js`: **`277.60 kB` (`gzip: 73.08 kB`)** — 1 single JS chunk (`1599 modules`).
- **Proposed Fix:** Lazy-load `CifvDashboard`, `SropsDashboard`, `AdminDashboard`, `BlockchainExplorer`, and `DoctorRosterModal` using `React.lazy()` + `<Suspense>`.

### 2.2 Unmemoized Filtering, Un-Debounced Search & Redundant Polling
- **Findings:**
  1. **Expensive JSON Stringify Filter on Every Render:** [`BlockchainExplorer.jsx:77-86`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/BlockchainExplorer.jsx#L77-L86) computes `filteredChain` on every render without `useMemo` or input debouncing, running `JSON.stringify(block.transactions).toLowerCase().includes(q)` across every block on each keystroke.
  2. **Redundant 10-Second Polling of Static Doctor Roster:** [`App.jsx:23-35`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/App.jsx#L23-L35) calls `fetchDoctors()` (`GET /api/auth/doctors`) inside `setInterval(..., 10000)` even though the 9-specialist roster is static, and calls `fetchBlockchain('ADMIN')` (downloading the entire chain) every 10 seconds just to update `blockHeight`.
  3. **Over-Fetching on Admin Mount:** [`AdminDashboard.jsx:42-47`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/AdminDashboard.jsx#L42-L47) fires 4 concurrent requests (`fetchAdminOverview`, `fetchCadavers`, `fetchOrgansList`, `fetchHarvestReports`) on initial mount regardless of active tab, and `harvestReports` (`line 28`) is never used anywhere in the component.
  4. **Repeated Array Filtering in Render Loops:** [`DoctorRosterModal.jsx:64-65`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/DoctorRosterModal.jsx#L64-L65) filters `doctors` on every render without `useMemo`.

---

## 3. SECURITY AND CLEANLINESS

### 3.1 Critical Security Leak: APIs Returning Plaintext PINs & Captcha Answers
- **Findings:**
  1. **`GET /api/admin/overview` Leaks All 9 Doctor PINs:** [`backend/routes/adminRoutes.js:71`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/adminRoutes.js#L71) returns `personnel: CONSORTIUM_CREDENTIALS.personnel` directly from [`backend/data/doctors.js:38-143`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/data/doctors.js#L38-L143), exposing `pin: '1010'` through `'3030'` in the JSON payload.
  2. **`GET /api/auth/doctors` Leaks All 9 Doctor PINs:** [`backend/routes/authRoutes.js:85-92`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/authRoutes.js#L85-L92) returns the full `CONSORTIUM_CREDENTIALS.personnel` array (including `pin`) to unauthenticated callers.
  3. **UI Displays Plaintext PINs:** [`DoctorRosterModal.jsx:88`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/DoctorRosterModal.jsx#L88) (`PIN: {doc.pin}`) and [`MultiSigPad.jsx:212`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/MultiSigPad.jsx#L212) (`Default PIN: ...`) render doctor PINs on screen.
  4. **Permissive CORS (`origin: '*'`):** [`backend/server.js:15`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/server.js#L15) allows any external origin.
- **Proposed Fix:** Strip `pin` (and any private credential fields) via a sanitizer helper `sanitizePersonnel(doc)` before returning from `/api/admin/overview` and `/api/auth/doctors`.

### 3.2 Hardcoded Credentials & Secrets in Source Code and `README.md`
- **Findings:**
  - Department passwords (`Pass@cifv2026`, `Pass@srops2026`, `Pass@admin2026`, `Pass@external2026`) and doctor PINs (`1010`–`3030`) are hardcoded in [`backend/data/doctors.js:6-30, 46-138`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/data/doctors.js#L6-L138).
  - The same department passwords are hardcoded in frontend bundle code at [`frontend/src/components/LoginModal.jsx:16-20`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/LoginModal.jsx#L16-L20).
  - The HMAC cryptographic signing secret `'CONSORTIUM_ORGAN_SECRET_2026'` is hardcoded in [`backend/blockchain/cryptoUtils.js:29, 39`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/blockchain/cryptoUtils.js#L29-L40).
  - [`README.md:43-60`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/README.md#L43-L60) lists all department passwords and specialist PINs in plaintext.
- **Proposed Fix:** Create `backend/config/index.js` reading from `.env` (with `.env.example` committed), move passwords/PINs/HMAC secrets into environment variables, and remove plaintext passwords/PINs from `README.md` and frontend source.

### 3.3 Missing Input Validation Middleware & Inconsistent Error Response Shapes
- **Findings:**
  - `POST /api/cadavers` ([`cadaverRoutes.js:88-190`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/cadaverRoutes.js#L88-L190)) has **zero** required-field validation—an empty `{}` body creates a record for `'Unidentified Doe'` with `undefined` age, blood group, and death date.
  - `POST /api/organs/harvest` ([`organRoutes.js:117-200`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/organRoutes.js#L117-L200)) only checks `if (!data.cadaverHexId)` (`line 121`); it does not verify that `cadaverHexId` actually exists in `cadaverRegistry` or that its status is `VERIFIED_FOR_EXTRACTION`!
  - Error shapes are inconsistent across routes:
    - `authRoutes.js:32`: `{ success: false, error: 'Captcha code is required.' }`
    - `authRoutes.js:60-64`: `{ success: false, isExternalRestricted: true, error: '...' }`
    - `blockchainRoutes.js:17-21`: `{ success: false, error: 'CONSORTIUM_ACCESS_DENIED', message: '...' }`
  - `captchaStore` in [`authRoutes.js:7`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/authRoutes.js#L7) never cleans up abandoned expired captchas, leaking memory on repeated `GET /api/auth/captcha` calls.

### 3.4 Complete Inventory of Dead Code, Unused State & Unused Imports
| File | Lines | Dead Code / Unused Symbol |
| :--- | :--- | :--- |
| [`frontend/src/utils/api.js`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/utils/api.js#L23-L30) | `23–30` | Exported function `verifyDoctor()` is never imported or called anywhere. |
| [`frontend/src/components/Navbar.jsx`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/Navbar.jsx#L2) | `2` | Unused imports: `ShieldCheck`, `Activity`, `Hospital`. |
| [`frontend/src/components/VtopLanding.jsx`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/VtopLanding.jsx#L3-L17) | `3–17` | Unused imports: `Building2`, `FileCheck2`, `HeartPulse`, `ShieldCheck`, `Hospital`, `ExternalLink`, `FileText`, `Clock`, `Award`. |
| [`frontend/src/components/LoginModal.jsx`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/LoginModal.jsx#L2) | `2` | Unused imports: `KeyRound`, `CheckCircle2`. |
| [`frontend/src/components/DoctorRosterModal.jsx`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/DoctorRosterModal.jsx#L2) | `2` | Unused import: `Award`. |
| [`frontend/src/components/MultiSigPad.jsx`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/MultiSigPad.jsx#L2) | `2` | Unused imports: `KeyRound`, `Shield`. |
| [`frontend/src/components/CifvDashboard.jsx`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/CifvDashboard.jsx#L5-L80) | `5, 12, 16, 23, 48, 70, 71, 75, 80` | Unused imports: `Clock`, `ShieldAlert`, `ChevronRight`. Unused props: `onOpenExplorer`, `onOpenDoctors`. Unrendered `formData` fields: `otherMedicalTerms`, `nokConsentSignature`, `nokThumbprint`, `verifyingDoctorsCount`, `diseaseChecklist`. |
| [`frontend/src/components/SropsDashboard.jsx`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/SropsDashboard.jsx#L4-L34) | `4, 5, 7, 11, 14, 15, 17, 34` | Unused imports: `Plus`, `Trash2`, `Clock`, `Activity`, `ChevronRight`, `Camera`, `Thermometer`. Unused props: `onOpenExplorer`, `onOpenDoctors`. |
| [`frontend/src/components/AdminDashboard.jsx`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/AdminDashboard.jsx#L3-L30) | `3, 7, 9, 10, 12, 14, 15, 17, 18, 23, 28, 29, 30` | Unused imports: `ShieldAlert`, `FileSpreadsheet`, `CheckCircle2`, `AlertTriangle`, `Search`, `Download`, `Building`, `Award`, `Sparkles`, `Layers`. Unused prop: `onOpenDoctors`. Unused state variables: `harvestReports`, `loading`, `searchQuery`. |
| [`frontend/src/components/BlockchainExplorer.jsx`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/BlockchainExplorer.jsx#L5-L13) | `5, 8, 11, 13` | Unused imports: `Hash`, `Layers`, `RefreshCw`, `KeyRound`. |
| [`backend/routes/organRoutes.js`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/organRoutes.js#L2) | `2` | Unused import: `import crypto from 'crypto'`. |
| [`backend/blockchain/transaction.js`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/blockchain/transaction.js#L27-L33) | `27–33` | Unused method `Transaction.addSignature()`. |
| [`backend/blockchain/cryptoUtils.js`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/blockchain/cryptoUtils.js#L39-L41) | `39–41` | Unused exported function `verifyDoctorSignature()`. |
| [`backend/blockchain/blockchain.js`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/blockchain/blockchain.js#L116-L123) | `116–123` | Unused method `Blockchain.checkConsortiumAccess()` (duplicated by middleware in `blockchainRoutes.js:7-25`). |

---

## 4. EASY TO UNDERSTAND (Architecture, Documentation & Tooling)

### 4.1 Folder Structure (`routes -> services -> store`)
- **Finding:** Route files ([`cadaverRoutes.js`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/cadaverRoutes.js) at 291 lines, [`organRoutes.js`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/organRoutes.js) at 305 lines) mix HTTP request parsing, seed data initialization, ID generation, cryptographic hashing, threshold signature logic, and blockchain block mining in a single file.
- **Proposed Fix:** Refactor into thin HTTP controllers (`backend/routes/`), business logic services (`backend/services/`), and persistence (`backend/store/`).

### 4.2 Missing File Header Comment Blocks & JSDoc
- **Finding:** None of the 22 `.js`/`.jsx` files in `/backend` or `/frontend/src` include a top-of-file summary block or `@param`/`@returns` JSDoc annotations on exported functions.

### 4.3 Duplicated Magic Strings & Constants
- **Finding:**
  - `ORGAN_CODE_MAP` / `ORGAN_CODES` is duplicated verbatim in [`frontend/src/components/SropsDashboard.jsx:23-32`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/components/SropsDashboard.jsx#L23-L32) and [`backend/routes/organRoutes.js:11-20`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/routes/organRoutes.js#L11-L20).
  - Record statuses (`PENDING_INSPECTION_SIGNATURES`, `VERIFIED_FOR_EXTRACTION`, `PENDING_SURGICAL_SIGNATURES`, `CERTIFIED_HARVEST`), transaction types (`CONSORTIUM_INITIALIZATION`, `CADAVER_INTAKE_DRAFT`, `CADAVER_VERIFIED_BLOCK`, `ORGAN_EXTRACTION_RECORDED`, `ORGAN_HARVEST_CERTIFIED_BLOCK`), and organ distribution matchers (`adminRoutes.js:44-50`) are scattered as raw string literals.
- **Proposed Fix:** Extract all shared constants (statuses, transaction types, organ codes, cold ischemia deadline windows) into a single shared constants module (`backend/constants/index.js` and `frontend/src/utils/constants.js`).

### 4.4 Missing ESLint, Prettier & Automated Test Scripts
- **Finding:** Neither [`backend/package.json`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/backend/package.json) nor [`frontend/package.json`](file:///c:/Users/Mayan/OneDrive/Documents/Saranjivi%20paper/Lab%202/Lab%202/frontend/src/package.json) has `eslint`, `prettier`, or a `"test"` script configured.

---

## 5. Prioritized Engineering & UX Action List

| ID | Category | Item Description | Files Touched |
| :- | :--- | :--- | :--- |
| **C1** | **Backend Performance & Store** | Consolidate `cadaverRegistry`, `harvestReports`, and `ledger` into a unified `store` module with batched/async persistence; add summary views, pagination (`?page=&limit=`), and separate image endpoints; measure before/after with benchmark script. | `backend/store/`, `backend/blockchain/blockchain.js`, `backend/routes/*.js` |
| **C2** | **Backend Security & Validation** | Strip `pin` from `/api/admin/overview` and `/api/auth/doctors`; move credentials/secrets to `.env` + `backend/config/` + `.env.example`; add POST validation middleware & consistent error shape; prune expired captchas. | `backend/config/`, `backend/middleware/`, `backend/data/doctors.js`, `backend/routes/*.js` |
| **C3** | **Backend Clean Architecture & Constants** | Refactor `routes -> services -> store`, extract shared constants (`statuses`, `txTypes`, `organCodes`, `deadlines`), add file headers & JSDoc, remove dead code/unused imports. | `backend/constants/`, `backend/services/`, `backend/routes/`, `backend/blockchain/` |
| **C4** | **Frontend Performance & Cleanliness** | Lazy-load dashboards and `BlockchainExplorer` (`React.lazy` + `Suspense`), memoize heavy lists (`useMemo`), debounce search, stop 10s polling of static doctors, remove all unused imports/dead state, and measure bundle size before/after. | `frontend/src/App.jsx`, `frontend/src/components/*.jsx`, `frontend/src/utils/api.js` |
| **C5** | **Tooling & Documentation** | Add minimal ESLint + Prettier config and run them; rewrite `README.md` (overview, Mermaid architecture diagram, setup without plaintext passwords, numbered end-to-end flow, API table, role guide). | `README.md`, `.eslintrc*`, `.prettierrc`, `package.json` |
| **R1–R8** | **UI Redesign (`UI_REDESIGN.md`)** | Implement `R1` (`TimeStatusBadge` + `TermTooltip`), `R2` (2-of-3 `MultiSigPad`), `R3` (CIFV 4-Step Wizard), `R4` (SROPS 3-Step Wizard), `R5` (Timeline `BlockchainExplorer`), `R6` (`AdminDashboard` search & cert fix), `R7` (`Navbar`/`VtopLanding`/`LoginModal`), `R8` (WCAG AA & keyboard accessibility) + `/docs/UI_CHANGELOG.md`. | `frontend/src/components/*.jsx`, `docs/UI_CHANGELOG.md` |
