# QA Lab Bug Capture — local beta

A Chrome/Edge Manifest V3 extension. Click the toolbar action on an HTTP/HTTPS page to capture its visible viewport, page title, URL and browser environment. A separate review tab lets you highlight areas, paint solid black redactions, describe the bug, choose a workspace/project and optionally link a test case.

## Install and try

1. Open `chrome://extensions` or `edge://extensions`, enable Developer mode, select **Load unpacked**, and choose this `browser-extension` directory.
2. Open a page to test and click **QA Lab Bug Capture** in the extensions toolbar.
3. In the report tab, connect with your QA Lab login. Local settings: website `http://localhost:5173/QA-Labs-Frontend`, API `http://localhost:4000/api`. Production defaults are the current Vercel website and QA Lab API.
4. Allow access to the chosen API origin when the browser requests it. Choose a Tester or QA Lead workspace and project.
5. Review URL, environment and screenshot; redact personal data; write expected/actual results; check the review confirmation; submit. Open the saved bug in QA Lab.

The backend must include the `attachmentId` evidence validator change, and the frontend must include authenticated evidence downloads. Existing backend permissions are enforced; Viewers cannot report bugs. Temporary-password accounts must change their password in QA Lab first. Platform administrators use a workspace membership rather than bypassing workspace roles.

## Privacy and limits

Capture only happens after a toolbar click using `activeTab`. There is no persistent access to the websites being tested. API access is requested for the chosen origin, not every site. URLs remove credentials/query/fragment automatically, but paths and screenshots still require review. Black redactions are flattened into the uploaded PNG. Undo is available before submission. You can omit the screenshot.

Captures and access tokens are kept in browser session memory, accessible only to trusted extension pages; closing the browser clears them. Passwords are never stored. Only configured website/API URLs persist locally. Screenshot and environment are sent only when Submit is pressed. No console, network, cookies or browsing history are collected in this version.

The screenshot uses the existing authenticated attachment endpoint and upload size limit. If the upload or evidence link fails after bug creation, Retry reuses that bug in the same report tab. A timeout during bug creation has an unknown outcome: check the tracker before retrying. Keep the report tab open until evidence finishes; restoring drafts after browser restarts and full server-side idempotency are future work. Captures show the visible viewport, not a full-page image. Browser/store pages are unsupported. This version links a test case; direct test-run linking comes later.

This is an unpacked local beta, not a Chrome Web Store release. Publishing requires store assets, a privacy policy, permission review and verification against deployed API and durable production file storage.

## Checks

From the frontend repository, run `node --test browser-extension/core.test.mjs`. Chrome API capture/permission behavior requires a real unpacked installation; a normal webpage preview cannot exercise those APIs.
