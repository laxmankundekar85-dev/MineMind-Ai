# MineMind-AI ⚡

> **Enterprise AI-Powered Geological, Mining, and Statutory Reporting Governance Platform for CMPDI and Coal India Limited (CIL) Subsidiaries.**

[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini API](https://img.shields.io/badge/Gemini_API-2.5_Flash-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 Problem Statement & Context

* **Problem Statement ID:** 26023
* **Title:** AI-Powered Geological, Mining and other Reporting Solution for CMPDI/CIL subsidiaries
* **Organization:** Ministry of Coal
* **Department:** Coal India Limited (CIL) / Central Mine Planning & Design Institute (CMPDI)
* **Category:** Software
* **Theme:** Smart Automation

### The Challenge
Coal mining operations and geological exploration across CIL's 8 regional subsidiaries (CMPDI, SECL, ECL, BCCL, CCL, WCL, NCL, MCL) generate immense volumes of multi-format unstructured records, borehole logs, statutory compliance filings, and shift logs.
- **Version Drifts & Silent Overwrites**: Uncoordinated report revisions lead to dangerous numerical discrepancies (e.g. altered stripping ratios or coal reserve estimates).
- **Misinformation in AI Queries**: Generic LLM assistants retrieve unverified draft PDFs, causing compliance and safety risks in open-cast and underground mines.
- **Unverified Scanned & Visual Data**: Geological strata charts, drill logs, and field photos are uploaded as unindexed flat images without automated OCR verification or spatial validation.

### The Solution: MineMind-AI
MineMind-AI enforces an **AI-governed Versioning, Verification, and Ingestion Pipeline**:
1. **Multi-Modal Document & Image OCR**: Automated extraction of tabular assays, drill paths, and statutory text.
2. **Deterministic Diff & AI Compliance Engine**: Automated checks against DGMS benchmarks, reserve calculations, and cross-subsidiary consistency.
3. **Dual Role Architecture (Admin & Mining Engineer)**: Role-based governance where draft updates must pass automated risk scans and human executive sign-off before being indexed into the retrieval-augmented generation (RAG) vector database.
4. **Offline-First Underground Capability**: PWA caching and offline RAG embeddings so mining engineers inside pit environments can query safety standards without internet connectivity.

---

## 🏛️ System Architecture

```
                               ┌────────────────────────────────┐
                               │       MineMind-AI Engine       │
                               └───────────────┬────────────────┘
                                               │
                      ┌────────────────────────┴────────────────────────┐
                      ▼                                                 ▼
        ┌───────────────────────────┐                     ┌───────────────────────────┐
        │   Mining Engineer Portal  │                     │  Executive Admin Portal   │
        │ (Subsidiary Contributor)  │                     │   (Central Governance)    │
        ├───────────────────────────┤                     ├───────────────────────────┤
        │ • Knowledge Center & Docs │                     │ • Executive Dashboard     │
        │ • Upload & Paste (Ctrl+V) │                     │ • Central Approval Queue  │
        │ • AI Query Assistant      │                     │ • AI Contradiction Engine │
        │ • My Submitted Updates    │                     │ • Audit Trail & Compliance│
        │ • Offline Pit Cache Sync  │                     │ • Global System Reports   │
        └─────────────┬─────────────┘                     └─────────────▲─────────────┘
                      │                                                 │
                      │ 1. Upload Field Log / Strata Chart              │ 3. Flags Discrepancies
                      ▼                                                 │
        ┌───────────────────────────────────────────────────────────────┴─────────────┐
        │                       Multi-Format OCR & Parsing Engine                     │
        │      (PDF.js / Dynamic Optical Pipeline / Canvas Image Processor)           │
        └──────────────────────────────────────┬──────────────────────────────────────┘
                                               │
                                               │ 2. Scans for Format & Category Mismatch
                                               ▼
        ┌─────────────────────────────────────────────────────────────────────────────┐
        │                 Benchmark & Version Diff Workbench (v1.0 vs v2.0)           │
        │        • Side-by-Side Dual Pane  • Wipe Curtain Slider  • Onion Skin        │
        └──────────────────────────────────────┬──────────────────────────────────────┘
                                               │
                                               │ 4. Executive Sign-Off & Approval
                                               ▼
        ┌─────────────────────────────────────────────────────────────────────────────┐
        │                   Indexed Organizational Knowledge Catalog                  │
        │         • Source-Grounded RAG Assistant    • Automated Topic Word Cloud     │
        └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Core Features & Modules

### 1. 📑 Automated Report Generation Platform
* **5-Step Guided Synthesis Wizard**:
  1. **Template Selection**: Standardized statutory templates (DGMS Monthly Safety Return, Annual Exploration & Core Drilling Summary, MoEF&CC Environmental Clearance Compliance, Monthly Production & Dispatch Reconciliation, Quarterly Statutory Mine Safety Inspection).
  2. **Reporting Period**: Dynamic timeframe selector with automatic reporting cycle validation.
  3. **Subsidiary & Mine Area**: Target subsidiary filtering with localized operational parameters.
  4. **Source Data Linking**: Automatic multi-document selection from verified internal repositories and recent borehole ingestion batches.
  5. **AI Synthesis & Compilation**: Generation of structured executive summaries, risk registers, lithological strata tables, and statutory declarations.
* **Direct Export**: Instant client-side PDF export (via `jsPDF` and `html2canvas`) formatted with official CMPDI headers and tabular styling.

### 2. ☁️ Automated Word Cloud & Topic Identification
* **Dynamic Topic Hub**: Real-time visual cluster representation of dominant geological and operational themes (e.g., *Seam-IV Gas Desorption, Overburden Sandstone Stability, Strata Void Ratio, Slope Stability, Heavy Earth Moving Machinery*) with exact document reference counts.
* **Subsidiary Distribution**: Track keyword occurrences across CMPDI, SECL, ECL, BCCL, WCL, etc.
* **Temporal Trend Analysis**: Longitudinal tracking of recurring environmental, structural, and safety keywords.

### 3. 🔍 AI-Based Query & Response System (RAG Assistant)
* **Natural Language Querying**: Conversational interface accepting queries on strata depths, stripping ratios, statutory gas limits, DGMS circulars, and environmental compliance data.
* **Strict Source Attribution**: Every AI response delivers confidence scores and clickable primary source citations (document title, version number, section reference, and subsidiary code).
* **Underground Zero-Connectivity RAG (Pit Cache)**: Local client-side indexed knowledge cache enabling field engineers to query indexed technical manuals, DGMS rules, and cached borehole data in underground mine workings without an active internet connection.

### 4. 🔬 Multi-Modal Version Comparison Workbench
* **Side-by-Side Dual View**: Compares baseline benchmark reference against proposed revisions.
* **Wipe Curtain Slider**: Interactive divider slider showing real-time before/after image differences.
* **Onion Skin Overlay**: Adjustable opacity overlay revealing spatial drill-path and diagram shifts.
* **Interactive Tooling**:
  * **Zoom & 100% Reset**: Dynamic zoom controls.
  * **90° Stepped Rotation**: Perfect for landscape strata logs and maps.
  * **Optical Filters**: Switch between Normal, High-Contrast, Monochrome Grayscale, and Inverted colors.
  * **Direct Clipboard Paste (Ctrl+V)**: Paste diagrams or screenshots straight into the revision tool.
  * **Full-Size Inspection**: Launch high-resolution assets in dedicated new tabs.

### 5. 🛡️ Executive Governance & Central Approval Queue
* **Priority Triage Matrix**: Submissions automatically scored as **Urgent**, **Standard**, or **Routine**.
* **AI One-Line Reasoning**: Highlights exact numerical deviations (e.g. *“Proposed update increases overburden depth by +1.2m without accompanying geotechnical re-assay”*).
* **Bulk Routine Sign-Off**: One-click approvals for minor low-risk formatting changes.
* **Immutable Audit Trail**: Cryptographically tracked changelog recording every upload, OCR extraction, inspection action, revision, and approval timestamp.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Core** | React 18, TypeScript, Vite |
| **Styling & UI** | Tailwind CSS, Lucide React Icons |
| **Animation** | Motion (`motion/react`) |
| **Charts & Data Viz** | Recharts, SVG Canvas |
| **AI & NLP Engine** | Google Gemini API (`gemini-2.5-flash`), TF-IDF Keyword Cluster Engine |
| **Document Processing** | PDF.js, jsPDF, html2canvas, Client-side OCR Tokenizer |
| **Offline Architecture** | Progressive Web App (PWA) Service Workers, LocalStorage / IndexedDB Pit Cache |

---

## 📦 Project Structure

```
MineMind-AI/
├── public/                     # Static assets and PWA manifest
├── src/
│   ├── components/             # Modular React UI components
│   │   ├── AdminDashboard.tsx      # Central Governance & Priority Matrix
│   │   ├── AiAssistant.tsx         # Verified RAG Query Assistant
│   │   ├── AiInsights.tsx          # Dynamic Word Cloud & Topic Clusters
│   │   ├── ApprovalQueue.tsx       # Triage Approval & Decision Engine
│   │   ├── AuditTrail.tsx          # Immutable Compliance Log
│   │   ├── CompareVersionsModal.tsx# Multi-Mode Diff & Image Workbench
│   │   ├── EmployeeDashboard.tsx   # Contributor Portal View
│   │   ├── Header.tsx              # Role Switcher & System Navigation
│   │   ├── KnowledgeCenter.tsx     # Central Repository & Ingestion Hub
│   │   ├── MineMindHeroBanner.tsx  # Overview & Quick Actions
│   │   ├── MyUpdates.tsx           # Contributor Submission Tracker
│   │   ├── ReportGenerator.tsx     # 5-Step Statutory Report Wizard
│   │   ├── SettingsView.tsx        # Enterprise Preferences & API Config
│   │   ├── Sidebar.tsx             # Main Navigation Drawer
│   │   └── SourceViewerModal.tsx   # Verified Document Inspector
│   ├── context/                # Application State Context (Docs, Roles, Auth)
│   ├── data/                   # Initial Coal India Repositories & Benchmarks
│   ├── utils/                  # Core Utilities & Algorithms
│   │   ├── complianceEngine.ts     # Format & Category Relevance Algorithm
│   │   ├── imageViewerUtils.ts     # Optical Canvas & SVG Strata Generator
│   │   ├── offlineRAG.ts           # Underground Pit Cache Engine
│   │   └── soundEffects.ts         # User Interaction Sound Cues
│   ├── types.ts                # TypeScript Interfaces & Data Models
│   ├── App.tsx                 # Root Layout & Routing Component
│   ├── index.css               # Tailwind CSS Entry Point
│   └── main.tsx                # Application Entry Point
├── package.json                # Project Dependencies & Scripts
├── tsconfig.json               # TypeScript Configuration
├── vite.config.ts              # Vite Build Configuration
└── README.md                   # Project Documentation
```

---

## 💻 Getting Started / Installation

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### Local Setup
```bash
# 1. Clone the repository
git clone https://github.com/priyadike23-ctrl/Minemind-Ai-.git
cd Minemind-Ai-

# 2. Install dependencies
npm install

# 3. Configure environment variables (optional for live Gemini API)
cp .env.example .env
# Add your GEMINI_API_KEY if testing custom live AI prompts

# 4. Start the development server
npm run dev
```
Open your browser and navigate to **`http://localhost:3000`**.

### Production Build
```bash
npm run build
```
This builds the application into the `dist/` folder ready for static hosting or Cloud Run container deployment.

---

## 📚 Comprehensive Documentation Index

* 🏆 **[SIH Problem Statement Compliance & Feature Mapping](./SIH_PROBLEM_STATEMENT_COMPLIANCE.md)**: Direct mapping of SIH Problem Statement #26023 (Ministry of Coal) requirements against our implemented modules.
* ⚡ **[Complete Automations & Intelligent Workflows](./AUTOMATIONS.md)**: Exhaustive breakdown of all 10 automation engines (Multi-Modal OCR, Statutory Pre-Screening, Merkle Ledger, RAG Citations, Contradiction Detection, Form IV Compilation, Offline Pit Cache, Voice Engine, RBAC Triage).
* 🎙️ **[Master Viva Speech & Team Roles Pitching Guide](./TEAM_ROLES_AND_PITCH_GUIDE.md)**: Word-for-word viva presentation scripts, 5-role team contribution breakdown, architecture defense, and examiner Q&A cheat sheet.
* 🛠️ **[Technology Stack Specification](./TECH_STACK.md)**: Detailed breakdown of frontend, backend, AI/RAG engine, data visualizers, security mechanisms, and dependency manifest.
* 🎓 **[Master Viva Questions & Answers Guide](./VIVA_QUESTIONS_AND_ANSWERS.md)**: 18+ in-depth viva questions, 30-second pitches, architecture breakdown, AI/RAG mechanics, and rapid-fire cheat sheet.
* 📈 **[Impact Metrics & Mathematical Data Lineage](./IMPACT_METRICS_DATA_LINEAGE.md)**: Deep mathematical formulations, variables ($T_{\text{baseline}}$, OCR Confidence, Clean Approvals), live data pipelines, and audit reproducibility protocol.
* 🏛️ **[System Architecture & Workflow Specification](./SYSTEM_ARCHITECTURE_WORKFLOW.md)**: 6-tier architecture diagrams, data pipelines, and offline edge sync mechanics.
* 📊 **[SIH Presentation Slides & Script](./SIH_PRESENTATION_SLIDES.md)**: Slide-by-slide pitch deck and judge demonstration flow.
* 📝 **[Project Presentation Breakdown](./PROJECT_PRESENTATION_BREAKDOWN.md)**: Functional breakdown of features, user journeys, and impact metrics.

---

## 👥 User Roles & Testing Walkthrough

You can switch roles anytime using the profile selector in the top-right header:

### 1. Testing as a Mining Engineer (Subsidiary Contributor)
1. Navigate to **Knowledge Center**.
2. Click **Upload New Document / Revision**.
3. Upload an image or PDF (or use **Paste Ctrl+V** to paste an image from your clipboard).
4. Provide the mandatory revision justification and submit.
5. Head to **AI Assistant** to test queries against approved data or test **Offline Pit Cache** mode.

### 2. Testing as a Central Governance Admin
1. Open the **Executive Dashboard** to inspect the **Priority Matrix**.
2. Click **Demo Category Mismatch** to review flagged anomalous submissions (e.g. CMPDI HQ-984).
3. Click **Compare Diff** to launch the **Version Comparison Workbench**.
4. Test the **Dual Pane**, **Wipe Curtain Slider**, and **Onion Skin** overlays.
5. Click **Approve & Index** or **Reject with Audit Feedback** in the Central Approval Queue.

---

## 📄 License
This project is developed for Coal India Limited (CIL) & Central Mine Planning & Design Institute (CMPDI) under Problem Statement ID 26023. Distributed under the MIT License.

