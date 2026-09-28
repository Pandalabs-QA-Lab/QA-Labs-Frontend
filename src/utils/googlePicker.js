const scriptPromises = new Map()
let pickerPromise = null
let currentAccessToken = null
let accessTokenExpiresAt = 0

// Helper to dynamically load external script tags
function loadScript(src) {
  if (scriptPromises.has(src)) return scriptPromises.get(src)

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    const fail = () => {
      clearTimeout(timeout)
      scriptPromises.delete(src)
      script.remove()
      reject(new Error('Could not load Google Drive. Check your connection and try again.'))
    }
    const timeout = setTimeout(fail, 12000)
    script.onload = () => {
      clearTimeout(timeout)
      resolve()
    }
    script.onerror = fail
    document.head.appendChild(script)
  })
  scriptPromises.set(src, promise)
  return promise
}

// Load Google API Client (gapi) and Google Identity Services (gis) SDKs
export async function loadGoogleSDKs() {
  await Promise.all([
    loadScript('https://apis.google.com/js/api.js'),
    loadScript('https://accounts.google.com/gsi/client')
  ])
}

// Initialize Picker API
function initPicker() {
  if (pickerPromise) return pickerPromise
  pickerPromise = new Promise((resolve, reject) => {
    if (!window.gapi) {
      reject(new Error('Google API Client (gapi) is not loaded.'))
      return
    }
    const timeout = setTimeout(() => reject(new Error('Google Drive picker took too long to load. Please try again.')), 12000)
    window.gapi.load('picker', {
      callback: () => {
        clearTimeout(timeout)
        resolve()
      },
      onerror: () => {
        clearTimeout(timeout)
        reject(new Error('Failed to load Google Picker library.'))
      }
    })
  })
  pickerPromise.catch(() => { pickerPromise = null })
  return pickerPromise
}

// Main function to authenticate and open the Google Picker dialog.
// options:
//   mode      'spreadsheets' → import flows (Sheets/Excel/CSV only)
//             'all'          → evidence flows (upload + any file, images, videos)  [default]
//   multiple  allow selecting more than one file at once
export function openGooglePicker(onPicked, onError, options = {}) {
  const apiKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const projectNumber = import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_NUMBER

  if (!apiKey || !clientId || !projectNumber) {
    if (onError) {
      onError('Google Drive import has not been connected yet. Please contact your administrator.')
    } else {
      console.error('Google Picker configuration is incomplete.')
    }
    return
  }

  // Google Picker itself has a 566 × 350 minimum dialog size.
  if (window.innerWidth < 590 || window.innerHeight < 374) {
    if (onError) onError('Google Drive picker needs a larger screen. Use a tablet or desktop, or choose another import option.')
    return
  }

  loadGoogleSDKs()
    .then(() => initPicker())
    .then(() => {
      // If we already have an access token, launch the picker directly
      if (currentAccessToken && Date.now() < accessTokenExpiresAt) {
        launchPicker(currentAccessToken, onPicked, options)
        return
      }

      // Each pick needs its own callback and options.
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response) => {
          if (response.error) {
            if (onError) onError(`Google authentication failed: ${response.error}`)
            return
          }
          if (response.access_token) {
            currentAccessToken = response.access_token
            accessTokenExpiresAt = Date.now() + Math.max(0, (response.expires_in || 0) - 60) * 1000
            launchPicker(currentAccessToken, onPicked, options)
          }
        },
        error_callback: () => {
          if (onError) onError('Google sign-in was interrupted. Please try again.')
        },
      })

      // Ask for consent for a new session, then reuse the grant on refresh.
      tokenClient.requestAccessToken({ prompt: currentAccessToken ? '' : 'consent' })
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
  const projectNumber = import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_NUMBER
  const { picker: Picker } = window.google

  const builder = new Picker.PickerBuilder()
    .setOAuthToken(accessToken)
    .setDeveloperKey(apiKey)
    .setAppId(projectNumber)
    .setSize(
      Math.max(566, Math.min(960, window.innerWidth - 24)),
      Math.max(350, Math.min(650, window.innerHeight - 24))
    )
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
