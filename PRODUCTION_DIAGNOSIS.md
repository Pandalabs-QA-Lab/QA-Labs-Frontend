# Production loading diagnosis — 1 October 2026

The production site is `https://qa-labs-seven.vercel.app/` and its API is `https://git-pipeline.metatronhost.in/qa-labs/api`.

## Confirmed causes

1. DashboardPage fetched project records into the in-memory API cache, then read test cases, bugs, runs, plans, and milestones from the legacy localStorage cache. A fresh browser showed zero totals even though the API returned data. Aggregate readers now use the API cache.
2. ProjectsPage memoized its totals without the version published by the cache-loading hook. When data arrived, its cards kept the initial zero counts. The version is now a dependency.
3. AdminPage used one Promise.all for overview, requests, users, and workspaces. The production users and workspace directory endpoints returned 404, discarding the successful overview result too. Reads now settle independently; available sections are shown and unavailable endpoints produce a deployment error.
4. The deployed backend lacks the project folder endpoint. Frontend and backend deployments are out of step. Production's frontend bundle also lacks the live project-summary refresh introduced in commit 6872e14.

## Evidence

- Frontend and `/api/health`: HTTP 200.
- Admin login, `/auth/me`, `/access/admin/overview`, `/auth/workspaces`: HTTP 200.
- `/access/admin/users`, `/access/admin/workspaces`: HTTP 404, `Not found`.
- Every inspected project's `/folders`: HTTP 404, `Not found`.
- The selected workspace's three projects returned 19 test cases, 13 bugs, and four test runs in total. Its dashboard displayed zero cases and bugs. Bug totals here include closed bugs; the dashboard's open count depends on status.
- The six data endpoints used by aggregate views all returned HTTP 200. There was no database outage or CORS failure in the reproduced dashboard session.
- API responses during the checks were approximately 90–290 ms. This does not measure performance under production load.
- The corrected production build, served locally on port 4173 against the live API, displayed three projects, 19 test cases, 10 open bugs, and a 56% dashboard pass rate on first entry and after reload. The admin overview displayed its totals while reporting the missing directory routes. No production project records were modified for this verification.

## Fix and rollout

Dashboard, Projects, and Reports now show loading and retry states rather than reporting zero or no projects before requests finish. A failed project refresh does not erase the last successfully cached records.

Deploy the updated backend feature branch, including scoped invitations, administration, shared project folders, and acceptance criteria. Back up the production database and apply checked-in migrations with `npx prisma migrate deploy`; generate the client with `npx prisma generate`, then restart the backend. Deploy the matching frontend afterward. Local migration success does not apply migrations to production.

Verify the missing admin and folder routes return HTTP 200 for authorized users, then open the dashboard in a fresh browser, compare totals with project records, and reload. An existing user visiting individual modules first should not be necessary to populate global totals.

No production records were created or deleted during diagnosis. Selecting an existing admin workspace and signing in used the normal app flow.
