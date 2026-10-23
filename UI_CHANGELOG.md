# MediChain — UI Redesign Changelog

This document records the implemented UI redesign items from `/docs/UI_REDESIGN.md`, including exact files modified, build verification results, and manual test scripts per role.

---

## Batch 1 (Implemented: `R1`, `R2`, `R5`, `R7`, `R8`)

### Summary of Batch 1 Commits

| Item | Commit | Summary | `npm run build` Result |
| :--- | :--- | :--- | :--- |
| **`R1`** | `53fe9ae` | Plain-language terminology tooltips (`TermTooltip.jsx`), display-only time-window countdown badge (`TimeStatusBadge.jsx`), and `/api/deadlines` helper with client-side fallback (`api.js`). | Passed (`1599 modules`, `6.40s`, `0 errors`, JS `277.60 kB` / `73.08 kB` gzip) |
| **`R2`** | `1b272df` | Redesigned `MultiSigPad.jsx` showing `"0 of 2 required approvals (out of 3 specialists)"` / `"1 of 2 required approvals (out of 3 specialists)"` / `"2 required approvals collected (out of 3 specialists)"`, all 3 specialists as clickable `Signed` / `Pending` cards (Name, Role, Department, Public Key only), modal stays open after 1st approval, and removed unvalidated Captcha. | Passed (`1600 modules`, `6.08s`, `0 errors`, JS `281.25 kB` / `74.34 kB` gzip) |
| **`R5`** | `30c56cc` | Rebuilt `BlockchainExplorer.jsx` with a plain-language Timeline View by default, expandable per-block cryptographic proof drawer (`hash`, `previousHash`, `merkleRoot`, raw JSON + copy buttons), Technical Detail View toggle, and mobile scroll support. | Passed (`1600 modules`, `6.35s`, `0 errors`, JS `293.70 kB` / `76.89 kB` gzip) |
| **`R7`** | `fd535e4` | Added plain-language role titles + `<TermTooltip />` and a 1-click "Switch Role" menu in `Navbar.jsx`, updated `VtopLanding.jsx`, fixed `LoginModal.jsx` subtitle (`selectedDept.title`) and removed hardcoded password exposure, and updated `DoctorRosterModal.jsx` and `AdminDashboard.jsx` (personnel tab) to display **Name, Role, Department, and Public Key only** (no PINs, passwords, or private keys). | Passed (`1600 modules`, `6.77s`, `0 errors`, JS `296.21 kB` / `77.49 kB` gzip) |
| **`R8`** | `7a9145f` | Applied WCAG AA contrast tokens (`text-slate-600` replacing `text-slate-400` on light surfaces), `12px` (`text-xs`) minimum font size, explicit `<label htmlFor>` + `id` bindings on all form fields, keyboard-focusable `sr-only peer` file upload inputs, `Escape`-key + `role="dialog"` + `aria-modal="true"` on modals, replaced `alert()` calls with inline error banners, and wired display-only `<TimeStatusBadge />` across `CifvDashboard.jsx`, `SropsDashboard.jsx`, and `AdminDashboard.jsx`. | Passed (`1601 modules`, `7.05s`, `0 errors`, JS `308.07 kB` / `81.13 kB` gzip) |

---

### Detailed Change Breakdown (Batch 1)

#### `R1` — Plain-Language Tooltips (`TermTooltip`) & Display-Only Countdown Badge (`TimeStatusBadge`)
- **Files Touched:**
  - `frontend/src/components/TermTooltip.jsx` *(Created)*
  - `frontend/src/components/TimeStatusBadge.jsx` *(Created)*
  - `frontend/src/utils/api.js` *(Updated — added `fetchDeadlines()`)*
- **What Changed:**
  - Created `<TermTooltip term="..." />` with hover and keyboard-focusable (`aria-expanded`, `Escape` to dismiss) plain-language definitions for `CIFV`, `SROPS`, `CTORB`, `RTCN`, `Ed25519`, `SHA-256`, `Merkle Root`, `PoA`, `Cold Ischemia`, and `2-of-3 Multi-Sig`.
  - Created `<TimeStatusBadge />` as a **display-only** badge (`GREEN` / `AMBER` / `RED`) that consumes backend `/api/deadlines` fields (`status`, `remainingSeconds`, `windowSeconds`, `etaSeconds`, `expectedApprovalSeconds`) when present and falls back to client-side organ preservation / intake target windows when `/api/deadlines` is not yet mounted. It never disables, blocks, or skips any approval action.

#### `R2` — Clearer Multi-Signature Approval Modal (`MultiSigPad.jsx`)
- **Files Touched:**
  - `frontend/src/components/MultiSigPad.jsx` *(Updated)*
- **What Changed:**
  - Replaced technical dropdown + unvalidated secondary Captcha with an interactive 3-card specialist grid for the active department (`CIFV` or `SROPS`).
  - Displays `"0 of 2 required approvals (out of 3 specialists)"`, `"1 of 2 required approvals (out of 3 specialists)"`, and `"2 required approvals collected (out of 3 specialists)"` with a visual progress bar.
  - Each specialist card displays **Name, Role, Department, and Public Key only** (never PINs or private keys) along with a `Signed` or `Pending` status badge.
  - Keeps the modal open after the 1st specialist signs and automatically selects the next pending specialist so the 2nd required approval can be completed immediately without reopening the modal.

#### `R5` — Timeline-First & Mobile-Friendly Blockchain Explorer (`BlockchainExplorer.jsx`)
- **Files Touched:**
  - `frontend/src/components/BlockchainExplorer.jsx` *(Updated)*
- **What Changed:**
  - Set **Timeline View** as the default view mode (`viewMode === 'timeline'`), displaying plain-language event cards (`"Donor Ramesh Kumar registered by CIFV"`, `"Approved by 2 of 2 required specialists (out of 3)"`, etc.) in reverse chronological order.
  - Added an expandable `"Show Cryptographic Proof (Hashes, Merkle Root & Raw JSON)"` drawer on each timeline card with one-click copy buttons.
  - Preserved the full 2-pane inspection layout under the `"Technical Detail View"` toggle and removed `overflow-hidden` clipping on mobile viewports so the full chain is scrollable on small screens.

#### `R7` — Plain-Language Navigation, Quick Role Switcher & Credential Hygiene
- **Files Touched:**
  - `frontend/src/App.jsx` *(Updated)*
  - `frontend/src/components/Navbar.jsx` *(Updated)*
  - `frontend/src/components/VtopLanding.jsx` *(Updated)*
  - `frontend/src/components/LoginModal.jsx` *(Updated)*
  - `frontend/src/components/DoctorRosterModal.jsx` *(Updated)*
  - `frontend/src/components/AdminDashboard.jsx` *(Updated)*
- **What Changed:**
  - Added plain-language role labels paired with `<TermTooltip />` in `Navbar.jsx` and `VtopLanding.jsx`, plus a `"Switch Role"` dropdown in `Navbar.jsx` for 1-click portal switching.
  - Fixed `LoginModal.jsx` header subtitle bug (`selectedDept.title || selectedDept.name`) and removed hardcoded password strings so passwords are never exposed in the UI.
  - Updated `DoctorRosterModal.jsx` and the `AdminDashboard.jsx` specialists directory tab so every specialist card displays **Name, Role, Department, and Public Key only** (removed `doc.pin`, `doc.regNumber`, `doc.hospital`, and `doc.experience`).

#### `R8` — WCAG AA Contrast, Typography Floor, Keyboard Accessibility, Inline Messages & `TimeStatusBadge` Wiring
- **Files Touched:**
  - `frontend/src/index.css` *(Updated)*
  - `frontend/src/components/Captcha.jsx` *(Updated)*
  - `frontend/src/components/CifvDashboard.jsx` *(Updated)*
  - `frontend/src/components/SropsDashboard.jsx` *(Updated)*
  - `frontend/src/components/AdminDashboard.jsx` *(Updated)*
- **What Changed:**
  - Added semantic CSS custom properties in `frontend/src/index.css`, replaced low-contrast `text-slate-400` text on light backgrounds with `text-slate-600` / `text-slate-700` (WCAG AA ≥ 4.5:1), and enforced a minimum `text-xs` (`12px`) font size across all updated components.
  - Bound `<label htmlFor="...">` to matching `id="..."` attributes across all inputs in `CifvDashboard.jsx`, `SropsDashboard.jsx`, `LoginModal.jsx`, and `MultiSigPad.jsx`.
  - Replaced `className="hidden"` file inputs with keyboard-focusable `className="sr-only peer"` + `focus-within:ring-2` dropzones and inline 4 MB file-size validation.
  - Replaced all `alert()` calls in `CifvDashboard.jsx` and `SropsDashboard.jsx` with inline `role="alert"` error banners.
  - Wired display-only `<TimeStatusBadge />` onto donor and organ cards in `CifvDashboard.jsx`, `SropsDashboard.jsx`, and `AdminDashboard.jsx`.

---

### 3-Line Manual Verification Script per Role (Batch 1)

#### 1. CIFV Officer (`DEPT_CIFV`)
1. On the landing page, click **Sign In to CIFV**, enter password `Pass@cifv2026` + the 5-character Captcha code, and verify the navbar displays **Donor Intake & Consent** with a hover/focus `CIFV` tooltip.
2. In **New Donor Intake Form**, leave the Donor Name blank or upload a `> 4 MB` image to verify inline error feedback (no `alert()` popup), then fill in a donor name, age, and cause of death and click **Register Donor Dossier & Generate Record**.
3. In **Approval Queue**, verify the donor card displays the **Target Window** `<TimeStatusBadge />` and `"0 of 2 required approvals (out of 3 specialists)"`, click **Approve Record (0/2)**, sign with Dr. Rajesh Sharma (`PIN: 1010`), and confirm the modal stays open and advances to `"1 of 2 required approvals (out of 3 specialists)"` with Dr. Ananya Iyer pre-selected for the 2nd signature (`PIN: 1020`).

#### 2. SROPS Surgeon (`DEPT_SROPS`)
1. Click **Switch Role → Surgical Organ Recovery Suite (SROPS)** in the top navbar, sign in (`DEPT_SROPS` / `Pass@srops2026`), and verify each organ slot in the **Organ Recovery Form** displays its live **Preservation Window** `<TimeStatusBadge />` and keyboard-focusable photo upload control.
2. Select the approved donor from Step 1, click **Generate Surgical Recovery Dossier**, and verify the new report appears in **Surgical Reports Queue** with `"0 of 2 required approvals (out of 3 specialists)"` and per-organ `<TimeStatusBadge />` pills.
3. Click **Approve Recovery (0/2)**, verify all 3 SROPS surgeons appear as clickable cards showing **Name, Role, Department, and Public Key only**, and sign sequentially with Dr. Sunil Kulkarni (`PIN: 2010`) and Dr. Neha Deshmukh (`PIN: 2020`) in the same modal session to certify the harvest.

#### 3. CTORB Admin (`DEPT_ADMIN`)
1. Click **Switch Role → Central Regulatory & Audit Board (CTORB)** in the top navbar, sign in (`DEPT_ADMIN` / `Pass@admin2026`), and open **The 9 Certified Specialists** tab (and the top navbar **The 9 Specialists** modal) to confirm every card shows **Name, Role, Department, and Public Key only** (no PINs or passwords anywhere).
2. Open **Recovered Organs Registry** and **Donor Intake Dossiers** tabs to verify each organ and donor card displays its `<TimeStatusBadge />` countdown pill and `"2 of 2 required approvals (out of 3 specialists)"` status.
3. Click **Open Audit Ledger** (`BlockchainExplorer`) to verify it opens in **Timeline View** by default with plain-language event summaries, expand **Show Cryptographic Proof** on any block to inspect/copy its SHA-256 hash and Merkle root, and toggle **Technical Detail View** to inspect the 2-pane ledger view.

---

## Batch 2 (Pending Confirmation that Backend Steps 0 to 6 are Merged)
- *Waiting for confirmation before implementing `R3`, `R4`, `R6`, `R9` (Recipient Hospital screen), and `R10` (Amendment screen).*
