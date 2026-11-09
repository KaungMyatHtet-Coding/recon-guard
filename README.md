# 🛡️ ReconGuard
### Automated Multi-Channel Payment & Bank Slip Reconciliation Engine

[![Laravel 12](https://img.shields.io/badge/Laravel-12.x-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com)
[![React 18](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![MySQL 8.0](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com)
[![PHPUnit Tests](https://img.shields.io/badge/Tests-74%20Passed-10B981?style=for-the-badge&logo=checkmarx&logoColor=white)](https://phpunit.de)

---

## 📌 Executive Summary & Problem Domain

In fast-growing emerging markets like Myanmar and Southeast Asia, digital merchant transactions are heavily split across fragmented mobile wallets and banks: **KBZPay, WavePay, CB Pay, and AYA Pay**.

### The Traditional Friction & Fraud Epidemic:
1. **Manual Screenshot Verification:** Customers upload payment screenshots via chat apps or checkout portals. Finance teams manually inspect each slip—a bottleneck prone to human fatigue.
2. **Prevalent Slip Fraud Vectors:**
   - **Photoshop / Canva Amount Inflation:** Altering a 5,000 MMK receipt to claim 500,000 MMK.
   - **Reused Transaction IDs:** Submitting the same legitimate transaction slip across multiple distinct invoices.
   - **Duplicate Image Flooding:** Uploading identical receipt images for different orders.
3. **End-of-Day Bank Statement Discrepancies:**
   - Each payment provider issues CSV files with completely incompatible column schemas, timestamps, and fee structures.
   - Bank gateway fees (e.g., 200–500 MMK deductions) cause nominal amounts to mismatch invoice totals, landing legitimate payments into unresolved suspense ledgers.

**ReconGuard** completely automates this workflow: ingesting varied bank statements through the **Adapter Pattern**, extracting and analyzing slip images with **Zero-Cost Forensics & OCR**, executing an automated **3-Way Reconciliation Engine**, and providing **Chief Auditor Governance** with official PDF reporting.

---

## 🏛️ System Architecture

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 ReconGuard Core Engine                 │
                  └────────────────────────────────────────────────────────┘
                                               │
         ┌─────────────────────────────────────┼────────────────────────────────────┐
         ▼                                     ▼                                    ▼
┌──────────────────┐               ┌───────────────────────┐            ┌───────────────────────┐
│ Customer Invoice │               │  Customer Slip Image  │            │ Bank Statement CSVs   │
│  & Order Ledger  │               │      (OCR & EXIF)     │            │(KBZ, Wave, CB, AYA)   │
└────────┬─────────┘               └───────────┬───────────┘            └───────────┬───────────┘
         │                                     │                                    │
         │                             [Forensics & Hash]                   [Adapter Strategy]
         │                             - SHA-256 Fingerprint                - Header Auto-Detect
         │                             - EXIF / Tamper Marker               - Gross/Fee/Net Split
         │                             - Regex Heuristic OCR                - Chunked Ledger Save
         │                                     │                                    │
         └───────────────────────┬─────────────┴────────────────────────────────────┘
                                 │
                                 ▼
         ┌─────────────────────────────────────────────────────────┐
         │          3-Way Automated Reconciliation Engine          │
         ├─────────────────────────────────────────────────────────┤
         │ • Tier 1: Exact Match (Channel + TxnID + Gross)  100%   │
         │ • Tier 2: Fee-Adjusted Match (Gross == Slip)      95%   │
         │ • Tier 3: Fuzzy Heuristic (Levenshtein Dist <= 2) 75-90%│
         │ • Tier 4: Fraud Detection (Altered / Reused)     FLAG   │
         └─────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
         ┌─────────────────────────────────────────────────────────┐
         │             Chief Auditor Governance Suite              │
         ├─────────────────────────────────────────────────────────┤
         │ • Secondary Passcode Gate (`/admin/gate`)               │
         │ • Real-Time Fraud Blacklist & Compliance Appeals        │
         │ • Visual Reconciliation Analytics & Donut Charts        │
         │ • One-Click Official Printable / PDF Audit Report       │
         └─────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Engineering Highlights

### 1. Multi-Bank Statement Adapter Pattern (`app/Services/BankAdapters/`)
- Normalizes disparate statement files into a unified transaction ledger using a clean Object-Oriented Strategy/Adapter pattern:
  - `KbzPayStatementAdapter`: Maps `Transaction_No`, `Trade_Time`, `Fee_Amount`, `Settlement_Amount`.
  - `WavePayStatementAdapter`: Maps `Wave_Txn_ID`, `Date_Time`, `Commission_MMK`, `Net_MMK`.
  - `CbPayStatementAdapter`: Maps `Ref_No`, `Value_Date`, `Charges`, `Net_Credit`.
  - `AyaPayStatementAdapter`: Maps `AYA_Trans_Ref`, `Transaction_Date`, `Service_Fee`, `Total_Settled`.
- **Automatic Channel Heuristics:** Intelligently inspects CSV column headers to auto-detect the payment provider if omitted.

### 2. Zero-Cost Slip OCR & 3-Layer Image Forensics (`app/Services/SlipOcrAndForensicsService.php`)
- **Layer 1: SHA-256 Fingerprint:** Detects exact duplicate image files across all historic payments.
- **Layer 2: Reused Transaction ID:** Cross-references the extracted reference ID across all prior slips for the channel.
- **Layer 3: EXIF & Binary Marker Forensics:** Inspects image chunks for editing software artifacts (Photoshop, Canva, GIMP) and mock tamper markers.
- **Smart Fallback OCR:** Extracts `extracted_transaction_id`, `extracted_amount`, `sender_phone`, and `sender_name` with confidence scores.

### 3. Algorithmic 3-Way Reconciliation Engine (`app/Services/ReconciliationEngineService.php`)
- Cross-references three entities in atomic transactions:
  1. `exact_match` (100%): Exact channel, reference ID, and gross amount match.
  2. `fee_adjusted_match` (95%): Provider fee deduced (`gross_amount == slip_amount`, `net_amount == slip_amount - fee`).
  3. `fuzzy_match` (75–90%): Levenshtein string distance ($\le 2$ character OCR read errors) matched against sender phone and transaction amount within a $\pm 15$ minute window.
  4. `tampered_fraud` / `duplicate_id_fraud`: Automatic interception with discrepancy ledger entry.

### 4. Chief Auditor Governance & Audit Reporting (`app/Http/Controllers/Admin/`)
- Protected by a verified secondary passcode security gate (`/admin/gate`).
- Dynamic SVG data visualization: Reconciliation Breakdown Donut Chart, Channel Volume Bar Chart.
- Real-time customer fraud blacklist registry and dispute appeal queue.
- Official printable/exportable PDF Reconciliation Audit Report with certified reference numbers and digital stamp.

### 5. UI/UX Polish: Dual-Language, Dark/Light Mode & Mobile Experience
- **Dual-Language Support (`EN | မြန်မာ`):** Built-in React Language Context with instant switching to Myanmar Unicode font (`Noto Sans Myanmar` / `Padauk`).
- **Dark & Light Mode Terminal:** FinTech dark terminal (`#121212` background, `#1C1C22` surfaces) and high-contrast light mode, persisted via `ThemeContext`.
- **Mobile Bottom Navigation (`md:hidden`):** Dedicated fixed bottom navigation bar with quick shortcuts for Dashboard, Invoices, Statements, Reconciliation, and Governance.

---

---

## 💻 Local Setup & Development

### Prerequisites
- PHP 8.2 or 8.3
- Composer 2.x
- Node.js 20.x & npm
- MySQL 8.0

### Step-by-Step Installation

```bash
# 1. Clone repository
git clone https://github.com/KaungMyatHtet-Coding/recon-guard.git
cd recon-guard

# 2. Install PHP & Node dependencies
composer install
npm install

# 3. Configure environment
cp .env.example .env
php artisan key:generate

# 4. Configure database in .env (DB_DATABASE=reconguard)
# Run migrations and seed the comprehensive demo dataset
php artisan migrate --seed

# 5. Build frontend assets
npm run build
# Or run dev hot-reloader: npm run dev

# 6. Start the local server
php artisan serve
```

---


---

## 🐳 Production Deployment & Docker

ReconGuard is ready for cloud deployment (Docker, Railway, Render, AWS ECS) with a multi-stage `Dockerfile` and self-healing startup script:

```bash
# Build Docker container
docker build -t reconguard .

# Run container on port 8080
docker run -p 8080:8080 --env-file .env reconguard
```

The container automatically links storage, caches configuration and routes, runs pending database migrations, and auto-seeds demonstration datasets if the database is newly initialized.

---

## 📄 License
This project is open-source software licensed under the [MIT License](LICENSE).
