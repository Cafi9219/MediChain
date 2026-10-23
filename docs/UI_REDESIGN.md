# MediChain UX Redesign Proposal (`PHASE 3`)

> **Design Philosophy:** Preserve 100% of existing backend API contracts (`/api/auth`, `/api/cadavers`, `/api/organs`, `/api/blockchain`, `/api/admin`) and zero heavy external dependencies, while transforming the UI into a guided, mobile-first, WCAG AA-accessible clinical workflow ready for the **Deadline Engine**.

---

## 1. Simple Role-Based Navigation (One Main Task Per Screen + Clear "Next Step" CTA)

### Current Problem
- Users land on multi-tab dashboards where dense forms and queues compete for attention, props like `onOpenExplorer` and `onOpenDoctors` are passed into dashboards unused, and after completing an action (e.g., 1st signature or 2nd signature), there is no guided "Next Step" CTA to move the clinical workflow forward.

### Proposed Navigation Architecture
1. **Top Bar (`Navbar.jsx`):**
   - Streamlined into 3 clear zones:
     - **Left:** MediChain Brand + Active Role Pill (`Donor Intake • CIFV`, `Surgical Recovery • SROPS`, `Regulatory Board • CTORB`) with a **"Switch Role"** quick-switcher button.
     - **Center (when logged in):** Primary view pills with live action-needed counters:
       - **CIFV:** `[1. Register Donor]` → `[2. Sign & Approve]`
       - **SROPS:** `[1. Log Organ Recovery]` → `[2. Certify Recovery]`
       - **CTORB Admin:** `[1. Live Watchtower]` → `[2. Organ & Donor Registry]` → `[3. Medical Directory]`
     - **Right:** `[Ledger Timeline #Block]` button, `[9 Specialists]` button, and `[Sign Out]`.
2. **Guided "Next Step" Banner on Every Screen:**
   - Upon submitting a Donor Intake form → automatically highlights the newly created donor card at the top of the **Sign & Approve** screen and displays a prominent **"Next Step: Collect 1st Doctor Approval (0 of 2 required approvals)"** button.
   - Upon reaching `2 required approvals out of 3 specialists` in CIFV → displays a green completion banner with a clear CTA: **"Donor Cleared for Surgery! Switch to Surgical Recovery (SROPS) →"**.
   - Upon reaching `2 required approvals out of 3 specialists` in SROPS → displays a green completion banner with a clear CTA: **"Organs Certified! View in Regulatory Watchtower (Admin) →"**.

---

## 2. Step-by-Step Wizards with Progress Bar, Saved Drafts & Inline Validation (`R3` & `R4`)

### 2.1 CIFV Donor Intake 4-Step Wizard (`CifvDashboard.jsx` — `R3`)
Instead of rendering 26 inputs on a single scrolling page, split the form into **4 focused wizard steps** (max 5–7 fields per screen) with a clickable progress bar:

- **Step 1: Donor Identity & Timeline (25%)**
  - Fields: *Full Name (or Unidentified)*, *Age (0–120)*, *Sex*, *Blood Group*, *Date & Time of Death*, *Date & Time of Arrival*, *Certified Cause of Death*.
  - Physical traits (*Body Condition*, *Hair Color*, *Skin Color*, *Distinguishing Marks*) are tucked into an expandable **"Physical Description"** summary card.
- **Step 2: Biometric & Photo Evidence (50%)**
  - Fields: 3 side-by-side cards (*Face Photo*, *Fingerprint Scan*, *Eye / Retinal Scan*).
  - If *"Damaged / Trauma"* is checked on Fingerprints or Eyes, the textarea is strictly validated inline before proceeding to Step 3.
- **Step 3: Family Consent or Police Handover (75%)**
  - Fields: Segmented toggle (`Family Present (Next of Kin)` vs. `Unclaimed / Police Inquest`).
  - Inline required validation ensures either *Next of Kin Name + Relationship + Phone* OR *Police Inquest Report Details* is provided.
- **Step 4: Medical Eligibility & Review Summary (100%)**
  - Fields: *Suitable for Organ Recovery* (`Yes`/`No` + notes), *Infectious Disease Screen* (`Negative`/`Positive`), *Examining Doctors*.
  - Shows a compact **Read-Only Review Summary** of Steps 1–3 before final submission.
  - Clearly states that `2 required approvals out of 3 specialists` are needed after intake submission.

### 2.2 SROPS Surgical Recovery 3-Step Wizard (`SropsDashboard.jsx` — `R4`)
Fixes the destructive `useEffect` bug (`SropsDashboard.jsx:67-69`) and splits the 27–62 field page into **3 steps**:

- **Step 1: Select Cleared Donor & Arrival Time (33%)**
  - Visual donor selector cards showing Blood Group, Time Since Death, and Viability Countdown badge.
  - *Suite Arrival Date & Time*.
- **Step 2: Recovered Organs Builder (66%)**
  - **Non-Destructive Add/Remove Organ Cards:** Stepping $N$ up/down **preserves existing organ slots** (`prev.slice(0, newCount)` or appends only newly added slots).
  - **Organ ID Preservation & Duplicate Rejection:** Preserves the previewed `organId` on the server and rejects duplicate organ IDs or duplicate single-organ types.
- **Step 3: Surgical Team & Final Review (100%)**
  - Fields: *Number of Surgeons*, *Operating Surgeons*, *Perfusion & Recovery Notes*, plus a summary table of all $N$ organs before clicking **"Save Recovery Report & Proceed to Sign"** (`2 required approvals out of 3 specialists`).

### 2.3 Auto-Saved Drafts (`localStorage`) & Inline Validation
- **Auto-Save Drafts:** Both wizards persist form fields only (never PINs or signatures) to `localStorage` and clear the draft immediately after a successful submit.
- **Zero Native `alert()` Calls:** All `alert()` calls are replaced with inline validation messages.

---

## 3. Clearer Multi-Signature Screen (`MultiSigPad.jsx` — `R2`)

### Current Problem
- Displays `"1 of 3 Signatures"` and a 33%/66% progress bar even though **2 required approvals out of 3 specialists** complete certification and mine the block.
- Hides the 3 department specialists inside a `<select>` dropdown instead of showing who has signed vs. who is pending.
- Exposes plaintext PINs (`Default PIN: 1010`) in the UI.

### Proposed Multi-Signature Design
1. **Accurate "1 of 2 Required Approvals (Out of 3 Specialists)" Progress Header:**
   - Headline: **`0 of 2 required approvals`**, **`1 of 2 required approvals`**, or **`2 required approvals collected (out of 3 specialists)`**.
   - Subtext: *Rule: 2 required approvals out of 3 specialists to seal this record on the blockchain.*
   - Progress bar fills **0% → 50% → 100% (Green)**.
2. **Visual Roster of All 3 Department Specialists (Signed vs. Pending Cards):**
   - Renders all 3 department specialists as interactive cards showing **Name, Role, Department, and Public Key** (never PINs) alongside a clear `Signed ✓` or `Pending` status badge.
3. **Streamlined Signing Flow (Stay Open for 2nd Approval):**
   - After the 1st specialist signs (`1 of 2 required approvals`), `MultiSigPad` stays open, automatically selects the next pending specialist, and shows an inline confirmation banner so the 2nd specialist can sign immediately.

---

## 4. Plain-Language Wording + Technical Term Tooltips (`R1` & `R7`)

All heavy blockchain and forensic jargon is replaced with clear clinical language in primary labels, accompanied by a keyboard-focusable `<TermTooltip />` (`ⓘ`) badge that reveals the formal technical term on hover or focus.

| Current UI Jargon | Proposed Plain-Language Label | Tooltip Technical Term (`ⓘ`) |
| :--- | :--- | :--- |
| `Cadaveric Intake & Forensic Verification Wing (CIFV)` | **Donor Intake & Medical Exam (CIFV)** | *Consortium Node 1: Cadaveric Intake & Forensic Verification Wing* |
| `Surgical Retrieval & Organ Preservation Suite (SROPS)` | **Surgical Organ Recovery (SROPS)** | *Consortium Node 2: Surgical Retrieval & Organ Preservation Suite* |
| `Central Transplant Oversight Regulatory Board (CTORB)` | **Regulatory Oversight & Audit (Admin)** | *Consortium Node 3: Central Transplant Oversight Regulatory Board* |
| `Autogenerated Consortium Identifier (Hex ID)` | **Donor Tracking ID** | *Cryptographic 32-bit Hexadecimal Identifier (e.g., `0x4F8B7A92`)* |
| `2-of-3 Threshold Multi-Signature Verification` | **2 Required Approvals Out of 3 Specialists** | *2-of-3 Cryptographic Multi-Signature (HMAC-SHA256) Consensus Rule* |
| `VERIFIED (MINED)` / `CERTIFIED & MINED` | **Approved & Sealed on Ledger** | *Mined into Proof-of-Authority (PoA) Block on Consortium Blockchain* |
| `Cross-Clamp Timestamp` | **Organ Recovery Time (Cross-Clamp)** | *Aortic Cross-Clamp Timestamp (Start of Cold Ischemia Window)* |
| `Cold Ischemia Viability Limits` | **Safe Organ Preservation Time Limits** | *Maximum Cold Ischemia Time (CIT) before transplantation under SOTTO SOP* |
| `Merkle Root Hash` | **Transactions Summary Fingerprint** | *SHA-256 Binary Merkle Tree Root Hash of Block Transactions* |
| `Previous Block Hash` | **Link to Previous Record Block** | *Cryptographic SHA-256 Parent Block Hash Pointer* |

---

## 5. Display-Only Time-Status Badge & Countdown Component (`TimeStatusBadge.jsx` — `R1`)

Every donor card and organ/report card renders a reusable, **display-only** `<TimeStatusBadge />` component:
- **Primary Source:** Uses backend `/api/deadlines` fields when present (`riskLevel`, `remainingSeconds`, `remainingMs`, `deadlineAt`, `urgencyStatus`).
- **Client-Side Fallback:** Computes remaining time from existing timestamps (`deathDate`/`deathTime`, `arrivalDate`/`arrivalTime`, `extractionDate`/`extractionTime`, `createdAt`) against organ viability windows (`Heart/Lung: 6h`, `Pancreas/Bowel: 8h`, `Liver: 12h`, `Kidney: 30h`, `Cornea: 14d`, `CIFV Intake SLA: 6h`).
- **Display-Only Guarantee:** Never blocks or skips any signature or action.

---

## 6. Cleaner Blockchain Explorer (`BlockchainExplorer.jsx` — `R5`)

1. **Default View: Simple Clinical Timeline View:**
   - Displays each block in plain language (who submitted, what donor/organs were certified, which 2 out of 3 specialists signed, and when).
2. **Detail View for Hashes & Merkle Roots:**
   - Includes both a per-block **"Show Hashes, Merkle Root & Raw Payload"** drawer toggle and a top header mode switcher (`Timeline View` vs. `Technical Detail View`) with one-click Copy buttons.
3. **Mobile-First Responsive Scroll:**
   - Fixes the `overflow-hidden` clipping bug so mobile screens scroll cleanly through blocks and details.

---

## 7. Layout, Spacing, Design Tokens, Mobile-First & WCAG AA Accessibility (`R8`)

- **WCAG AA Contrast:** Replaces low-contrast `text-slate-400` on white (`2.56:1`) and `text-slate-600` on `bg-slate-950` (`2.58:1`) with high-contrast tokens (`text-slate-600` on light, `text-slate-300`/`text-slate-400` on dark, `>= 4.5:1`).
- **Form Labels & Keyboard Access:** Every form input has an explicit `<label htmlFor="...">` + `id="..."`, file uploads use `sr-only peer` instead of `hidden` so keyboard `Tab` works, and all modals close on `Escape` with `role="dialog"` and `aria-modal="true"`.
- **Zero Credential Leaks in UI (`R7`):** `DoctorRosterModal` and `AdminDashboard` show **Name, Role, Department, and Public Key only** — never PINs, passwords, or private keys.

---

## 8. Batch 2 Additions (`R9` & `R10` — After Backend Steps 0 to 6 Are Merged)

- **`R9` Recipient Hospital Screen:** Shows incoming allocated organ, ETA, time-window badge (`Green`/`Amber`/`Red`), and a **"Confirm Delivery"** button that submits an Ed25519 signed delivery receipt. Displays only data permitted for the assigned Recipient Hospital role.
- **`R10` Amendment Screen:** When a record is edited after signing, displays a prominent notice: **`"Record changed. Previous approvals are void. Re-sign required"`**, lists which prior specialist signatures were voided, and resets the approval progress bar (`0 of 2 required approvals out of 3 specialists`).

---

## 9. Implementation Plan (`Batch 1` Now, `Batch 2` After Backend Merge)

| Batch | ID | Item | Files Touched | Effort | Priority |
| :---: | :- | :--- | :--- | :---: | :---: |
| **Batch 1** | **R1** | **Display-Only `<TimeStatusBadge />` & `<TermTooltip />`** | `frontend/src/components/TimeStatusBadge.jsx`, `frontend/src/components/TermTooltip.jsx` | **S** | **P0** |
| **Batch 1** | **R2** | **Clearer `MultiSigPad` ("1 of 2 required approvals out of 3 specialists", 3 Signed/Pending Cards, No PIN Hint)** | `frontend/src/components/MultiSigPad.jsx` | **S** | **P0** |
| **Batch 1** | **R5** | **Timeline-First, Mobile-Friendly `BlockchainExplorer`** | `frontend/src/components/BlockchainExplorer.jsx` | **M** | **P1** |
| **Batch 1** | **R7** | **Role Navigation, Plain-Language Landing, `LoginModal` Fix & Strict No-PIN `DoctorRosterModal` / Admin Roster** | `Navbar.jsx`, `VtopLanding.jsx`, `LoginModal.jsx`, `DoctorRosterModal.jsx`, `AdminDashboard.jsx` | **S** | **P1** |
| **Batch 1** | **R8** | **WCAG AA Contrast, Design Tokens, `<label htmlFor>`, Keyboard File Uploads, `Escape` Modals & Inline Errors** | `index.css`, `LoginModal.jsx`, `MultiSigPad.jsx`, `CifvDashboard.jsx`, `SropsDashboard.jsx`, `AdminDashboard.jsx`, `BlockchainExplorer.jsx`, `DoctorRosterModal.jsx`, `VtopLanding.jsx` | **S** | **P2** |
| **Batch 2** | **R3** | **CIFV 4-Step Donor Intake Wizard + Drafts + Inline Validation** | `frontend/src/components/CifvDashboard.jsx` | **M** | **P0** |
| **Batch 2** | **R4** | **SROPS 3-Step Organ Recovery Wizard + Organ ID Preservation & Duplicate Rejection** | `frontend/src/components/SropsDashboard.jsx`, `backend/routes/organRoutes.js` | **M** | **P0** |
| **Batch 2** | **R6** | **Admin Watchtower Search, Countdowns & Certificate Status Fix** | `frontend/src/components/AdminDashboard.jsx` | **S** | **P1** |
| **Batch 2** | **R9** | **Recipient Hospital Screen (Incoming Organ, ETA, Badge, Signed Delivery Receipt)** | `frontend/src/components/RecipientDashboard.jsx`, `App.jsx` | **M** | **P0** |
| **Batch 2** | **R10** | **Amendment Notice & Voided Signatures Re-Sign Flow** | `CifvDashboard.jsx`, `SropsDashboard.jsx`, `MultiSigPad.jsx` | **M** | **P1** |
