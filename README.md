# QA Lab frontend

React 19 and Vite 8 frontend for QA Lab. The Express API in the sibling [backend repository](https://github.com/Pandalabs-QA-Lab/QA-Labs-Backend) handles accounts, workspace access, projects, and uploads. Keep the repositories separate so each can be built and deployed independently.

## Run locally

1. Start PostgreSQL and the backend using its [setup instructions](https://github.com/Pandalabs-QA-Lab/QA-Labs-Backend#run-locally). The API should respond at `http://localhost:4000/api/health`.
2. Install Node.js 22 or later and run:

   ```powershell
   npm ci
   Copy-Item .env.example .env
   npm run dev -- --host 127.0.0.1
   ```

3. Open `http://localhost:5173/QA-Labs-Frontend/`. Set `VITE_API_BASE_URL=http://localhost:4000/api` in `.env` if using the default backend port. Restart Vite after changing `.env`.

The app opens on a public landing/sign-in page. New accounts do not automatically get a workspace. A platform admin can approve workspace requests or users can accept an invite; roles are enforced by the backend. Admin rights are granted from a trusted backend shell, not by choosing an email in the browser.

QA Leads can invite a person by email from project settings or workspace settings. A project invite starts them as a Viewer of that project; a workspace invite starts them as a Viewer of all workspace projects. Existing accounts see invitations in the notification menu, and new recipients can register using the invited email. Each link expires after seven days. QA Lab currently opens an email draft or copies the link; it does not send invitation email automatically.

Platform admins can create accounts with temporary passwords and optionally place them in a workspace as Viewers. The new user must set a private password at first sign-in. Admins can remove access from one workspace or delete an ordinary account across all workspaces; workspace owners and platform admins are protected from account deletion.

## Project folders

Requirements and test cases use one shared folder tree per project. QA Leads can create nested folders, rename or move them, and assign items from either module. Selecting a parent folder includes items in its subfolders. Removing a folder keeps its contents by moving them to the parent (or to Unfiled at the project root). Folders do not currently organize plans, runs, or bugs.

## Requirements and test-case imports

Start with requirements. Each requirement can have a stable Key such as `REQ-001`, a description, and separate acceptance criteria (one per line). The requirement import accepts `.xlsx`, `.xls`, or `.csv`; download its template for the supported columns: `Key`, `Title`, `Description`, `Acceptance Criteria`, `Priority`, `Folder Path`, and `Test Case IDs`. The folder must already exist, and any Test Case IDs must match cases already in the project. Preview validates rows and lets you skip or update a matching key before saving.

Next, create test cases from a requirement's **Create linked test case** action, select linked requirements in the test-case editor, or import test cases with a `Requirement IDs` column. Separate multiple requirement keys with a comma, semicolon, or pipe. The import preview rejects unknown keys. The Coverage Matrix shows the resulting requirement-to-case mapping. For a new project, import requirements first, then cases with `Requirement IDs`; you do not need to re-import the requirements to add their links.

## Configuration

The committed `.env.example` lists all local variables. Keep `.env` out of Git. The Google Drive picker needs an OAuth web client ID, a browser API key, and the numeric Google Cloud project number from the same project. See [Google Drive setup](GOOGLE_DRIVE_SETUP.md) for Cloud Console and deployment steps. Firebase variables are optional for the legacy Firestore sync path; the current account and access flow requires the Express API.

## Checks and deployment

```powershell
npm run lint
npm run build
```

`dist/` is generated and ignored. The GitHub Pages workflow builds on pushes to `main` and serves the app under `/QA-Labs-Frontend/`; Vercel builds serve it at `/`. GitHub Actions uses repository variables. The checked-in `.env.production` supplies the hosted API URL and Google Picker's browser-visible values for Vercel builds. The Picker API key must remain restricted by website and API in Google Cloud.

Additional project notes: [data model](DATA_MODEL.md), [user flow](flow.md), and [tech stack](tech-stack.md).
