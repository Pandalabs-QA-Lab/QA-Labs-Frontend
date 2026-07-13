# QA Lab

<div align="center">
  <p align="center">
    <strong>Lightweight, Real-time Test Management & Defect Tracking.</strong>
  </p>
  <p align="center">
    <em>Manage testing workflows, track requirements coverage, and log defects—without the enterprise clutter.</em>
  </p>
</div>

---

## Key Features

- ⚡ **Real-Time Collaboration** — Powered by Cloud Firestore `onSnapshot` subscriptions. See test executions and bug updates across your team instantly.
- 📶 **Offline-First Resilience** — Local browser caching via namespaced `localStorage` guarantees instant page transitions and local fallbacks during network instability.
- 📊 **Requirements Traceability** — Direct linking between user requirements and test cases with an automated **Coverage Matrix** to check release readiness.
- 📋 **Interactive Step Builder** — Drag-and-drop manual test step ordering with support for modular **Shared Step Blocks** to eliminate repetitive steps.
- 🚀 **Google Workspace Integration** — Native Google Drive Picker integration for bulk uploading test spreadsheets (CSV/XLSX) and attaching evidence links.
- 🔌 **Bidirectional Jira Link** — Send logged QA Lab defects straight to your company's Jira boards with a single-click template generator.
- 📂 **Flexible Import Engine** — Import existing suites via SheetJS (Excel/CSV) or upload automated test reports using standard **JUnit XML** parsers.

---

## 🛠️ Tech Stack

```
   ┌────────────────────────────────────────────────────────┐
   │                       FRONTEND                         │
   │   React 19  •  Vite 8 (Rolldown)  •  React Router 7    │
   │        Mantine Components  •  Vanilla CSS Layouts      │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │                       BACKEND                          │
   │               Firebase Cloud Services                  │
   │    Auth (Google Sign-In)  •  Firestore Realtime DB     │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │                      INTEGRATIONS                      │
   │    Google Identity (GIS)  •  Google Picker API v3       │
   │                 Jira Cloud Connector                   │
   └────────────────────────────────────────────────────────┘
```

- **Core UI Framework:** [React 19](https://react.dev/) & [React Router v7](https://reactrouter.com/)
- **Build Pipeline:** [Vite 8](https://vite.dev/) with ESM-native Hot Module Replacement (HMR) and Rolldown chunk-splitting.
- **Database & Sync:** [Cloud Firestore NoSQL](https://firebase.google.com/docs/firestore) with reactive client subscriptions.
- **UI Components:** [Mantine UI](https://mantine.dev/) (Light mode) styled with custom brand css custom properties.
- **E2E Testing:** [Playwright](https://playwright.dev/) browser automation suite.

---

## 🚀 Getting Started

### Prerequisites

You need the following tools installed locally:
- [Node.js](https://nodejs.org/) (v18.x or later)
- [npm](https://www.npmjs.com/) (v9.x or later)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/pandalabs.git
   cd pandalabs
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory. You can copy the template from `.env.example`:
   ```bash
   cp .env.example .env
   ```

   Fill in your credentials:
   ```env
   # Firebase Web Configuration
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=project-id
   VITE_FIREBASE_STORAGE_BUCKET=project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:123...:web:...

   # Workspace Scoping
   VITE_QA_WORKSPACE_ID=my-workspace-id

   # Google Picker Integration
   VITE_GOOGLE_PICKER_API_KEY=AIzaSy...
   VITE_GOOGLE_CLIENT_ID=12345-abcde.apps.googleusercontent.com
   ```

### Running Locally

To launch the local development server with hot reload:
```bash
npm run dev
```
The application will be served at `http://localhost:5173/pandalabs/`.

### Creating a Production Build

To build the static application bundle with asset chunk-splitting:
```bash
npm run build
```
Vite will compile and output the optimized production build to the `/dist` folder. You can preview the production bundle locally with:
```bash
npm run preview
```

---

## 📁 Project Structure

```
pandalabs/
├── public/                 # Static assets & public resources
├── src/
│   ├── components/         # Reusable UI elements (Layout, Modals, Charts)
│   ├── context/            # React Global state providers (Auth, Toasts)
│   ├── hooks/              # Real-time state hooks (useTestCases, useBugs)
│   ├── pages/              # Routing endpoint view components
│   ├── utils/              # Parsers, storage helpers, and Google SDK loaders
│   ├── App.jsx             # React router entry & Mantine provider
│   ├── index.css           # Brand design system and custom CSS variables
│   └── main.jsx            # Core DOM renderer
├── firestore.rules         # Firebase Firestore security parameters
├── package.json            # Scripts & project dependencies
├── vite.config.js          # Rolldown bundler code-splitting configs
└── Playwright.config.js    # Browser automation controls
```

---

## 🔒 Security Rules & Database Schema

All database operations are encapsulated in a **workspace-level namespace** to support sandboxed testing spaces.

### Security Rules (Firestore)

Ensure your Cloud Firestore security parameters are configured to enforce workspace path matching:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /workspaces/{workspaceId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Data Structures

Collections reside nested under `/workspaces/{workspaceId}`:
* `/projects` — Project metadata, labels, and member association mappings.
* `/testCases` — Manual test steps, execution state, and modules.
* `/runs` — Run logs, test result status mapping (Passed/Failed/Blocked).
* `/bugs` — Logged defects, severity, logs, and evidence links.
* `/teamMembers` — Workspace roles (QA Lead, Tester, Viewer).

---

## 🧪 Automated Testing

We use **Playwright** to run end-to-end browser automation tests.

1. **Install Playwright Browsers:**
   ```bash
   npx playwright install
   ```

2. **Run All Tests:**
   ```bash
   npx playwright test
   ```

3. **Open Playwright UI Test Runner:**
   ```bash
   npx playwright test --ui
   ```

---

## 📄 License & Intellectual Property

Copyright © 2026 QA Lab. All rights reserved.

This repository, including all source code, assets, and documentation, is **proprietary, confidential, and private**. 

- Unauthorized copying, cloning, modification, distribution, or public hosting of this software via any medium is strictly prohibited.
- Use of this code is permitted only under an active commercial subscription or licensing agreement provided explicitly by the owners.

