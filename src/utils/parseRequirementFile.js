import * as XLSX from 'xlsx'

const COL = {
  'key': 'key',
  'id': 'key',
  'req id': 'key',
  'requirement id': 'key',
  'title': 'title',
  'requirement': 'title',
  'requirement title': 'title',
  'description': 'description',
  'desc': 'description',
  'acceptance criteria': 'acceptanceCriteriaRaw',
  'criteria': 'acceptanceCriteriaRaw',
  'folder': 'folderPathRaw',
  'folder path': 'folderPathRaw',
  'priority': 'priority',
  'test case ids': 'testCaseIdsRaw',
  'test cases': 'testCaseIdsRaw',
  'linked test cases': 'testCaseIdsRaw',
  'tc ids': 'testCaseIdsRaw',
}

const REQUIRED = ['title']

function normaliseHeader(h) {
  return String(h ?? '').toLowerCase().trim()
}

export function splitRequirementRefs(raw) {
  if (!raw) return []
  return String(raw)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function matchingTestCases(testCases, reference) {
  const key = String(reference).trim().toLowerCase()
  return testCases.filter((tc) => [tc.sourceTcId, tc.id, tc.id?.slice(0, 8)].some((id) =>
    String(id || '').trim().toLowerCase() === key))
}

/**
 * Parse requirement rows from spreadsheet buffer.
 * Returns { rows: { data, errors }[] }
 */
export function parseRequirementFile(buffer, filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const type = ext === 'csv' ? 'string' : 'array'

  const wb = XLSX.read(type === 'string' ? new TextDecoder().decode(buffer) : buffer, {
    type,
    cellDates: false,
    cellFormula: false,
    cellHTML: false,
  })

  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  if (raw.length < 2) return { rows: [] }

  const headerRow = raw[0]
  const colMap = Object.create(null)
  headerRow.forEach((h, i) => {
    const key = COL[normaliseHeader(h)]
    if (key) colMap[i] = key
  })

  const rows = raw.slice(1).map((cells, rowIdx) => {
    const data = Object.create(null)
    const errors = []

    Object.entries(colMap).forEach(([i, key]) => {
      data[key] = String(cells[Number(i)] ?? '').trim()
    })

    if (!data.title) {
      const hasContent = cells.some((c) => String(c ?? '').trim())
      if (hasContent) errors.push('Title is required')
      else return { data, errors: ['Empty row'], skip: true }
    }

    REQUIRED.forEach((field) => {
      if (!data[field]) errors.push(`Missing ${field}`)
    })

    data.testCaseIdsRaw = data.testCaseIdsRaw || ''
    data.acceptanceCriteriaRaw = data.acceptanceCriteriaRaw || ''
    data.folderPathRaw = data.folderPathRaw || ''
    data.priority = data.priority || ''

    return { data, errors, rowNum: rowIdx + 2 }
  })

  return { rows: rows.filter((r) => !r.skip) }
}

export function rowToRequirement(data, testCases = [], folderId = null) {
  const testCaseIds = splitRequirementRefs(data.testCaseIdsRaw)
    .map((ref) => matchingTestCases(testCases, ref)[0]?.id)
    .filter(Boolean)

  return {
    key: data.key || null,
    title: data.title.trim(),
    description: data.description || '',
    acceptanceCriteria: (data.acceptanceCriteriaRaw || '').split(/\r?\n|\|/).map((item) => item.trim()).filter(Boolean),
    folderId,
    priority: data.priority ? data.priority.charAt(0).toUpperCase() + data.priority.slice(1).toLowerCase() : 'Medium',
    testCaseIds: [...new Set(testCaseIds)],
  }
}
