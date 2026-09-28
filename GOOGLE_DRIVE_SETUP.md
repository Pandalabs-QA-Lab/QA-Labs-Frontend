# Google Drive import setup

Google Drive import and evidence picking use Google Picker. The frontend needs three values from **one Google Cloud project**. Firebase's API key and app ID are different values; do not substitute them for the Picker key or numeric Cloud project number.

1. In the QA Lab Google Cloud project, enable **Google Picker API** and **Google Drive API**. Note its numeric **project number** from the project dashboard.
2. Configure the OAuth consent screen and create an OAuth **Web application** client. Add `http://localhost:5173` and `https://pandalabs-qa-lab.github.io` as authorized JavaScript origins. Add any other actual deployment origin, such as a custom domain. If the consent screen is in Testing mode, add the Google accounts that will test Drive import.
3. Create a browser API key in the same project. Restrict it by HTTP referrer to `http://localhost:5173/*`, `https://pandalabs-qa-lab.github.io/*`, and `https://docs.google.com/*` (Picker runs inside a Google Docs iframe). Include any other deployed origin. Restrict the key to Google Picker API and Google Drive API.
4. Put these values in local `.env` (copy `.env.example` first) and restart Vite:

   ```env
   VITE_GOOGLE_PICKER_API_KEY=your_browser_api_key
   VITE_GOOGLE_CLIENT_ID=your_web_oauth_client_id.apps.googleusercontent.com
   VITE_GOOGLE_CLOUD_PROJECT_NUMBER=your_numeric_project_number
   ```

5. In the frontend GitHub repository, add those exact names as **Actions variables** under **Settings → Secrets and variables → Actions → Variables**. The Pages workflow passes them to the production build. The Vercel deployment currently uses the checked-in `.env.production` for these browser-visible values because the deployment account is not available here. If Vercel project access becomes available, move the values to Vercel build environment variables and remove them from `.env.production`.
6. Confirm with a Google test account: open a test case or bug bulk import, choose **Google Drive**, authorize Drive access, select a Sheet/Excel/CSV file, and check that the preview loads. Also try picking an evidence file. Test both local and deployed origins.

The OAuth scope is `drive.file`, which limits access to files the user selects or opens with this app. Picker requires the numeric project number as its app ID for this scope. These `VITE_` values are included in browser JavaScript, so the API key must have the referrer and API restrictions above.

Google's Picker has a minimum dialog size of 566 × 350 pixels. On narrower screens, QA Lab asks the user to use a larger screen or one of the local/URL import options instead of opening a clipped dialog.

References: [Google Picker setup](https://developers.google.com/workspace/drive/picker/guides/web-picker), [Picker `setAppId`](https://developers.google.com/workspace/drive/picker/reference/picker.pickerbuilder.setappid), and [Picker `setSize`](https://developers.google.com/workspace/drive/picker/reference/picker.pickerbuilder.setsize).
