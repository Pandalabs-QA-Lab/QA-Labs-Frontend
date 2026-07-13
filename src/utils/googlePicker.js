import { newId } from './id'

let gapiLoaded = false
let gisLoaded = false
let tokenClient = null
let currentAccessToken = null

// Helper to dynamically load external script tags
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = (err) => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

// Load Google API Client (gapi) and Google Identity Services (gis) SDKs
export async function loadGoogleSDKs() {
  if (gapiLoaded && gisLoaded) return

  await Promise.all([
    loadScript('https://apis.google.com/js/api.js'),
    loadScript('https://accounts.google.com/gsi/client')
  ])

  gapiLoaded = true
  gisLoaded = true
}

// Initialize Picker API
function initPicker() {
  return new Promise((resolve, reject) => {
    if (!window.gapi) {
      reject(new Error('Google API Client (gapi) is not loaded.'))
      return
    }
    window.gapi.load('picker', {
      callback: () => resolve(),
      onerror: () => reject(new Error('Failed to load Google Picker library.'))
    })
  })
}

// Main function to authenticate and open the Google Picker dialog.
// options:
//   mode      'spreadsheets' → import flows (Sheets/Excel/CSV only)
//             'all'          → evidence flows (upload + any file, images, videos)  [default]
//   multiple  allow selecting more than one file at once
export function openGooglePicker(onPicked, onError, options = {}) {
  const apiKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  if (!apiKey || !clientId) {
    if (onError) {
      onError('Google Picker API configuration is missing in environment variables.')
    } else {
      console.error('VITE_GOOGLE_PICKER_API_KEY or VITE_GOOGLE_CLIENT_ID is not configured.')
    }
    return
  }

  loadGoogleSDKs()
    .then(() => initPicker())
    .then(() => {
      // If we already have an access token, launch the picker directly
      if (currentAccessToken) {
        launchPicker(currentAccessToken, onPicked, options)
        return
      }

      // Initialize Google Identity Services (OAuth2) Token Client
      if (!tokenClient) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (response) => {
            if (response.error) {
              if (onError) onError(`Google Authentication failed: ${response.error}`)
              return
            }
            if (response.access_token) {
              currentAccessToken = response.access_token
              launchPicker(currentAccessToken, onPicked, options)
            }
          },
        })
      }

      // Request token. prompt: '' attempts to retrieve a token silently if previously authorized,
      // falling back to a popup prompt if needed.
      tokenClient.requestAccessToken({ prompt: '' })
    })
    .catch((err) => {
      console.error('[GooglePicker]', err)
      if (onError) onError(err.message)
    })
}

// Spreadsheet-family mime types — keeps the picker focused on importable files
const SHEET_MIME_TYPES = [
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
].join(',')

// Builder for Google Picker dialog
function launchPicker(accessToken, onPicked, options = {}) {
  const { mode = 'all', multiple = false } = options
  const apiKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY
  const { picker: Picker } = window.google

  const builder = new Picker.PickerBuilder()
    .setOAuthToken(accessToken)
    .setDeveloperKey(apiKey)
    .enableFeature(Picker.Feature.SUPPORT_DRIVES)
    .setCallback((data) => {
      if (data.action !== Picker.Action.PICKED) return
      // Iterate so multi-select delivers every chosen file to the caller
      ;(data.docs || []).forEach((file) => {
        onPicked({
          id: file.id,
          name: file.name,
          url: file.url || `https://drive.google.com/file/d/${file.id}/view`,
          mimeType: file.mimeType || '',
          sizeBytes: file.sizeBytes || 0,
        }, accessToken)
      })
    })

  if (multiple) builder.enableFeature(Picker.Feature.MULTISELECT_ENABLED)

  if (mode === 'spreadsheets') {
    // Import flows — only Sheets / Excel / CSV, compact list view
    const myDriveView = new Picker.DocsView(Picker.ViewId.DOCS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false)
      .setMimeTypes(SHEET_MIME_TYPES)
      .setMode(Picker.DocsViewMode.LIST)

    const sheetsView = new Picker.DocsView(Picker.ViewId.SPREADSHEETS)
      .setMode(Picker.DocsViewMode.LIST)

    builder
      .setTitle('Select a spreadsheet to import')
      .addView(myDriveView)
      .addView(sheetsView)
      .setSelectableMimeTypes(SHEET_MIME_TYPES)
  } else {
    // Evidence flows — upload anything from the computer, or pick any Drive file
    const uploadView = new Picker.DocsUploadView().setIncludeFolders(true)

    const imagesVideosView = new Picker.DocsView(Picker.ViewId.DOCS_IMAGES_AND_VIDEOS)
      .setMode(Picker.DocsViewMode.GRID)

    const allFilesView = new Picker.DocsView(Picker.ViewId.DOCS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false)
      .setMode(Picker.DocsViewMode.LIST)

    builder
      .setTitle('Add evidence — upload a file or pick from Drive')
      .addView(uploadView)
      .addView(imagesVideosView)
      .addView(allFilesView)
  }

  // Anchor the picker to our origin so it renders/scrolls correctly inside the app
  if (typeof window.location?.origin === 'string') {
    builder.setOrigin(window.location.origin)
  }

  const picker = builder.build()
  picker.setVisible(true)
}

// Fetch file contents from Google Drive API as an ArrayBuffer
export async function downloadDriveFile(fileId, mimeType, accessToken) {
  const isGoogleSheet = mimeType === 'application/vnd.google-apps.spreadsheet'
  const url = isGoogleSheet
    ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Access denied. Verify that the file sharing settings allow access, or try again.')
    }
    throw new Error(`Failed to download file from Google Drive (HTTP ${response.status})`)
  }

  return await response.arrayBuffer()
}
