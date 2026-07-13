# QA Lab — Technical Stack

> **Last updated:** July 2026
> **Project codename:** PandaLabs (pandalabs)

---

## 1. Core Framework

| Technology | Version | Purpose |
|:---|:---|:---|
| **React** | 19.2.x | UI library — functional components with hooks |
| **React DOM** | 19.2.x | DOM renderer for React |
| **React Router DOM** | 7.16.x | Client-side routing with nested layouts and lazy loading |
| **Vite** | 8.0.x (Rolldown) | Build tool & dev server — HMR, ESM-native, CSS code-splitting |
| **@vitejs/plugin-react** | 6.0.x | React Fast Refresh via Vite |

### Build Configuration

- **Base path:** `/pandalabs/` (for sub-path deployment)
- **CSS code-splitting:** Enabled — each lazy-loaded page gets its own CSS chunk
- **Manual chunks:** Vendor libraries split into `vendor-react` and `vendor-firebase` for long-term browser caching
- **Module system:** ES Modules (`"type": "module"`)

---

## 2. Backend & Database

| Technology | Purpose |
|:---|:---|
| **Firebase** (v12.14.x) | Full backend-as-a-service |
| **Firebase Authentication** | User identity — Google Sign-In (OAuth 2.0 provider) |
| **Cloud Firestore** | NoSQL document database — real-time sync via `onSnapshot` listeners |
| **Firebase Hosting** | Static site deployment (base path `/pandalabs/`) |

### Firestore Data Model

QA Lab uses a **workspace-scoped** Firestore structure. All collections live under a workspace document:

```
workspaces/{workspaceId}/
  ├── projects/
  ├── testCases/
  ├── bugs/
  ├── runs/
  ├── teamMembers/
  ├── sharedSteps/
  ├── requirements/
  ├── testPlans/
  ├── milestones/
  ├── comments/
  ├── notifications/
  └── activity/
```

### Firestore Operations Used

| Operation | Firebase Function | Where |
|:---|:---|:---|
| Real-time subscriptions | `onSnapshot` | All data hooks (via `remoteStorage.js`) |
| Read single doc | `getDoc` | Conflict resolution, workspace gate |
| Read collection | `getDocs` | Backup export, bulk operations |
| Create / Update | `setDoc` | All CRUD operations |
| Delete | `deleteDoc` | Removing test cases, bugs, etc. |
| Batch writes | `writeBatch` | Bulk imports, cascading deletes |

### Data Synchronization Architecture

```
┌────────────────────────────────────┐
│         React State (hooks)        │
│   useTestCases, useBugs, etc.      │
├────────────────────────────────────┤
│        localStorage Cache          │  ← Offline-first: instant UI on load
│         (storage.js)               │
├────────────────────────────────────┤
│    Firestore onSnapshot listeners  │  ← Real-time sync across all users
│       (remoteStorage.js)           │
├────────────────────────────────────┤
│       Cloud Firestore (GCP)        │  ← Source of truth
└────────────────────────────────────┘
```

- **Offline-first:** Data is cached in `localStorage` so the app loads instantly without waiting for Firestore.
- **Real-time sync:** Firestore `onSnapshot` listeners push changes to all connected clients in real time.
- **Conflict resolution:** `WorkspaceSyncContext` gates the app until the initial Firestore snapshot is received, preventing stale local data from overwriting remote changes.

---

## 3. Google APIs & Integrations

| API / SDK | Purpose |
|:---|:---|
| **Google Identity Services (GIS)** | OAuth 2.0 token acquisition for Drive access |
| **Google Picker API** | File selection dialog for Google Drive files |
| **Google Drive API v3** | Download/export selected files (spreadsheets, evidence attachments) |

### Google Picker Modes

| Mode | Used In | Allowed File Types |
|:---|:---|:---|
| `spreadsheets` | Bulk upload modals | Google Sheets, Excel (.xlsx), CSV |
| `all` | Evidence attachment fields | Any file — images, videos, documents, uploads |

### Environment Variables (Google)

```env
VITE_GOOGLE_PICKER_API_KEY    # Browser-restricted API key for Picker widget
VITE_GOOGLE_CLIENT_ID         # OAuth 2.0 Client ID for Google Sign-In & Drive
```

---

## 4. Styling

| Technology | Purpose |
|:---|:---|
| **Vanilla CSS** | All styling — no CSS framework or preprocessor |
| **CSS Custom Properties** | Design tokens for colors, spacing, typography |
| **CSS Media Queries** | Responsive layout (desktop, tablet, mobile) |

### CSS Files

| File | Scope |
|:---|:---|
| `index.css` | Global design system — variables, resets, components |
| `App.css` | App-level layout overrides |
| `landing-overrides.css` | Marketing/landing page specific styles |

### Design Approach

- **Dark mode:** Full dark theme support via CSS custom properties
- **Glassmorphism:** Used on landing page panels
- **Micro-animations:** Smooth transitions on hovers, modals, toasts
- **Mobile-first responsive:** Touch-friendly layouts with swipe-back navigation

---

## 5. Data Processing Libraries

| Library | Version | Purpose |
|:---|:---|:---|
| **SheetJS (xlsx)** | 0.18.x | Parse Excel (.xlsx, .xls) and CSV files for bulk imports |

### Bulk Import Flow

```
File Source (Local / Google Drive / URL)
    │
    ▼
SheetJS parses buffer → JSON rows
    │
    ▼
parseTestCaseFile.js / parseBugFile.js / parseRequirementFile.js
    │
    ▼
Mapped to app schema → Saved to Firestore
```

---

## 6. Development & Quality Tools

| Tool | Version | Purpose |
|:---|:---|:---|
| **ESLint** | 10.x | JavaScript/JSX linting |
| **eslint-plugin-react-hooks** | 7.x | Enforces Rules of Hooks |
| **eslint-plugin-react-refresh** | 0.5.x | Validates Fast Refresh compatibility |
| **Playwright** | 1.60.x | End-to-end browser testing |
| **@types/react** | 19.x | TypeScript type definitions (IDE IntelliSense) |
| **@types/react-dom** | 19.x | TypeScript type definitions (IDE IntelliSense) |

---

## 7. Application Architecture

### Project Structure

```
pandalabs/
├── public/                     # Static assets (favicon, etc.)
├── src/
│   ├── main.jsx                # App entry point
│   ├── App.jsx                 # Root component, routing setup
│   ├── App.css                 # App-level styles
│   ├── index.css               # Global design system
│   ├── landing-overrides.css   # Landing page styles
│   │
│   ├── pages/                  # 21 route-level page components
│   │   ├── LandingPage.jsx
│   │   ├── AuthPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── ProjectsPage.jsx
│   │   ├── TestCasesPage.jsx
│   │   ├── TestCaseDetailPage.jsx
│   │   ├── TestRunsPage.jsx
│   │   ├── TestRunDetailPage.jsx
│   │   ├── TestPlansPage.jsx
│   │   ├── BugTrackerPage.jsx
│   │   ├── RequirementsPage.jsx
│   │   ├── RequirementCoverageMatrixPage.jsx
│   │   ├── SettingsPage.jsx
│   │   ├── WorkspaceSettingsPage.jsx
│   │   ├── ProjectDashboardPage.jsx
│   │   ├── ProjectReportsPage.jsx
│   │   ├── ReportsPage.jsx
│   │   ├── ActivityPage.jsx
│   │   ├── BackupPage.jsx
│   │   ├── PublicReportPage.jsx
│   │   └── JoinPage.jsx
│   │
│   ├── components/             # 21 reusable UI components
│   │   ├── Layout.jsx          # Sidebar + top nav shell
│   │   ├── Modal.jsx           # Reusable modal dialog
│   │   ├── Charts.jsx          # SVG chart components
│   │   ├── StepBuilder.jsx     # Drag-to-reorder test steps
│   │   ├── BulkUploadModal.jsx # Test case bulk import
│   │   ├── BugBulkUploadModal.jsx
│   │   ├── CommentsPanel.jsx   # @mention-enabled comments
│   │   ├── OnboardingWizard.jsx
│   │   ├── WorkspaceGate.jsx   # Sync gate on app load
│   │   └── ...
│   │
│   ├── hooks/                  # 20 custom React hooks
│   │   ├── useTestCases.js     # CRUD + real-time sync for test cases
│   │   ├── useBugs.js          # CRUD + real-time sync for bugs
│   │   ├── useProjects.js
│   │   ├── useTestRuns.js
│   │   ├── useTestPlans.js
│   │   ├── useTeamMembers.js
│   │   ├── useRequirements.js
│   │   ├── useSharedSteps.js
│   │   ├── useActivity.js      # Audit log tracking
│   │   ├── useNotifications.js
│   │   ├── usePresence.js      # Online user presence
│   │   ├── useKeyboardShortcuts.js
│   │   ├── useSwipeBack.js     # Mobile swipe navigation
│   │   └── ...
│   │
│   ├── context/                # 5 React Context providers
│   │   ├── AuthContext.jsx     # Firebase Auth state
│   │   ├── ConfirmContext.jsx  # Global confirm dialog
│   │   ├── ToastContext.jsx    # Toast notification system
│   │   ├── WorkspaceSyncContext.jsx  # Firestore sync gate
│   │   └── UserContext.js
│   │
│   └── utils/                  # 27 utility modules
│       ├── firebase.js         # Firebase init & config
│       ├── remoteStorage.js    # Firestore CRUD abstraction layer
│       ├── storage.js          # localStorage cache layer
│       ├── googlePicker.js     # Google Drive Picker integration
│       ├── activity.js         # Audit trail logger
│       ├── entitySearch.js     # Fuzzy search engine
│       ├── export.js           # CSV/Excel export
│       ├── backup.js           # JSON backup/restore
│       ├── projectMembers.js   # Project-scoped member resolution
│       ├── parseTestCaseFile.js
│       ├── parseBugFile.js
│       ├── parseRequirementFile.js
│       ├── reportMetrics.js    # Report calculations
│       ├── planMetrics.js      # Test plan analytics
│       └── ...
│
├── .env                        # Environment variables (secrets)
├── .env.example                # Environment variable template
├── package.json
├── vite.config.js
├── flow.md                     # Architectural flow documentation
└── tech-stack.md               # ← This file
```

---

## 8. Key Architectural Patterns

### State Management

QA Lab does **not** use Redux, Zustand, or any external state management library. Instead, it uses:

| Pattern | Implementation |
|:---|:---|
| **React Context** | Global state (auth, toasts, confirms, sync gate) |
| **Custom hooks** | Per-entity CRUD state (`useTestCases`, `useBugs`, etc.) |
| **localStorage** | Offline cache for instant loading |
| **Firestore `onSnapshot`** | Real-time remote synchronization |

### Authentication Flow

```
LandingPage → AuthPage → Google Sign-In (Firebase Auth)
    → WorkspaceGate (sync check)
    → OnboardingWizard (first-time setup)
    → DashboardPage
```

### Role-Based Access Control

| Role | Permissions |
|:---|:---|
| **QA Lead** | Full CRUD, manage members, delete projects, configure settings |
| **Tester** | Create/edit test cases & bugs, execute runs |
| **Viewer** | Read-only access to all data |

### ID Generation

- **Test Case IDs:** Sequential format `TC-{MODULE}-{SEQ}` (e.g., `TC-LOGIN-001`)
- **Bug IDs:** Sequential format `BUG-{MODULE}-{SEQ}` (e.g., `BUG-LOGIN-001`)
- **Firestore doc IDs:** UUID v4 via `crypto.randomUUID()`

---

## 9. Browser APIs Used

| API | Purpose |
|:---|:---|
| `localStorage` | Data caching for offline-first experience |
| `crypto.randomUUID()` | Generating unique document IDs |
| `Drag and Drop API` | Reordering test steps in StepBuilder |
| `Clipboard API` | Copy-to-clipboard for sharing links |
| `matchMedia` | Detecting dark mode preference and responsive breakpoints |
| `ResizeObserver` | Responsive chart rendering |
| `Touch Events` | Swipe-back navigation on mobile |

---

## 10. Deployment

| Aspect | Detail |
|:---|:---|
| **Hosting** | Firebase Hosting |
| **Base URL** | `/pandalabs/` |
| **Build command** | `vite build` |
| **Dev server** | `vite` (HMR enabled) |
| **Environment** | Variables injected via `.env` at build time (`import.meta.env.VITE_*`) |

---

## 11. File & Codebase Statistics

| Metric | Count |
|:---|:---|
| Page components | 21 |
| Reusable components | 21 |
| Custom hooks | 20 |
| Utility modules | 27 |
| Context providers | 5 |
| CSS files | 3 |
| Unit test files | 2 |
| Total source files | ~107 |
| Production dependencies | 4 (`react`, `react-dom`, `react-router-dom`, `xlsx`) |
| Dev dependencies | 7 |
