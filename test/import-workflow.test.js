import test from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { parseRequirementFile, rowToRequirement, splitRequirementRefs } from '../src/utils/parseRequirementFile.js'
import { parseTestCaseFile, rowToTestCase, splitRequirementKeys } from '../src/utils/parseTestCaseFile.js'

function workbookBuffer(headers, cells) {
  const sheet = XLSX.utils.aoa_to_sheet([headers, cells])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Import')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

test('requirement import preserves criteria and resolves known test-case IDs', () => {
  const buffer = workbookBuffer(
    ['Key', 'Title', 'Acceptance Criteria', 'Folder Path', 'Test Case IDs'],
    ['REQ-01', 'Card payment', 'Valid card creates one order\nDeclined card creates no order', 'Shopping / Checkout', 'TC-01,TC-02'],
  )
  const { rows } = parseRequirementFile(buffer, 'requirements.xlsx')
  assert.equal(rows.length, 1)
  assert.deepEqual(splitRequirementRefs(rows[0].data.testCaseIdsRaw), ['TC-01', 'TC-02'])
  assert.equal(rows[0].data.folderPathRaw, 'Shopping / Checkout')
  const requirement = rowToRequirement(rows[0].data, [
    { id: 'case-1', sourceTcId: 'TC-01' },
    { id: 'case-2', sourceTcId: 'TC-02' },
  ], 'folder-1')
  assert.deepEqual(requirement.acceptanceCriteria, ['Valid card creates one order', 'Declined card creates no order'])
  assert.deepEqual(requirement.testCaseIds, ['case-1', 'case-2'])
  assert.equal(requirement.folderId, 'folder-1')
})

test('test-case import reads requirement keys for later linking', () => {
  const buffer = workbookBuffer(
    ['Module', 'Test Case Title', 'Test Steps', 'Expected Result', 'Requirement IDs'],
    ['Checkout', 'Declined card', 'Submit declined card', 'No order is created', 'REQ-01; REQ-02'],
  )
  const { rows } = parseTestCaseFile(buffer, 'cases.xlsx')
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0].errors, [])
  assert.deepEqual(splitRequirementKeys(rows[0].data.requirementKeysRaw), ['REQ-01', 'REQ-02'])
})

test('requirement import accepts a test case ID shown in the app', () => {
  const requirement = rowToRequirement({ title: 'Checkout', testCaseIdsRaw: 'A1B2C3D4' }, [
    { id: 'a1b2c3d4-1111-4444-8888-000000000001', sourceTcId: null },
  ])
  assert.deepEqual(requirement.testCaseIds, ['a1b2c3d4-1111-4444-8888-000000000001'])
})

test('CSV test-case import keeps its nested folder path and separate steps', () => {
  const csv = 'Module,Test Case Title,Test Steps,Expected Result,Folder Path\nCheckout,Card payment,Open checkout;Submit payment,One order,Checkout / Payments'
  const { rows } = parseTestCaseFile(new TextEncoder().encode(csv), 'cases.csv')
  const testCase = rowToTestCase(rows[0].data)
  assert.deepEqual(rows[0].errors, [])
  assert.equal(testCase.folder, 'Checkout / Payments')
  assert.deepEqual(testCase.steps, ['Open checkout', 'Submit payment'])
})
