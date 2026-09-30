import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'
import { useConfirm } from '../context/useConfirm'
import { useToast } from '../context/useToast'
import { folderIdsInBranch, folderPath } from '../hooks/useProjectFolders'

function FolderSvg({ open = false }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      {open && <path d="M2 10h20" />}
    </svg>
  )
}

function AllCasesSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <polyline points="3 6 4 7 6 5" />
      <polyline points="3 12 4 13 6 11" />
      <polyline points="3 18 4 19 6 17" />
    </svg>
  )
}

function UnfiledSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

function ChevronSvg({ open = false }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: open ? 'rotate(90deg)' : 'none',
        transition: 'transform 0.15s ease',
      }}
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export function ProjectFolderTree({
  folders, items, selectedId, onSelect, typeLabel, isLead,
  createFolder, updateFolder, deleteFolder, onChanged,
}) {
  const confirm = useConfirm()
  const toast = useToast()
  const menuRef = useRef(null)

  // Modals: mode can be 'create' | 'rename' | 'move' | null
  const [modalMode, setModalMode] = useState(null)
  const [targetFolder, setTargetFolder] = useState(null)
  const [parentFolder, setParentFolder] = useState(null)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [expanded, setExpanded] = useState({})
  const [saving, setSaving] = useState(false)
  const [menuFolderId, setMenuFolderId] = useState(null)

  // Close 3-dot dropdown menu on outside click
  useEffect(() => {
    if (!menuFolderId) return undefined
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuFolderId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuFolderId])

  const openCreate = (parent = null) => {
    setModalMode('create')
    setParentFolder(parent)
    setParentId(parent?.id || '')
    setName('')
    setMenuFolderId(null)
  }

  const openRename = (folder) => {
    setModalMode('rename')
    setTargetFolder(folder)
    setName(folder.name)
    setMenuFolderId(null)
  }

  const openMove = (folder) => {
    setModalMode('move')
    setTargetFolder(folder)
    setParentId(folder.parentId || '')
    setMenuFolderId(null)
  }

  const closeModal = () => {
    setModalMode(null)
    setTargetFolder(null)
    setParentFolder(null)
    setSaving(false)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      if (modalMode === 'create') {
        if (!name.trim()) return
        await createFolder({ name: name.trim(), parentId: parentId || null })
        toast.success('Folder created')
      } else if (modalMode === 'rename') {
        if (!name.trim()) return
        await updateFolder(targetFolder.id, { name: name.trim() })
        toast.success('Folder renamed')
      } else if (modalMode === 'move') {
        await updateFolder(targetFolder.id, { parentId: parentId || null })
        toast.success('Folder moved')
      }
      await onChanged?.()
      closeModal()
    } catch (error) {
      toast.error(error.message || 'Could not save folder')
      setSaving(false)
    }
  }

  const remove = async (folder) => {
    setMenuFolderId(null)
    const ok = await confirm({
      title: 'Remove folder?',
      message: `Items in “${folder.name}” will move to its parent folder. Subfolders will be kept.`,
      confirmLabel: 'Remove folder',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteFolder(folder.id)
      if (selectedId === folder.id) onSelect(folder.parentId || '')
      await onChanged?.()
      toast.success('Folder removed; items were kept')
    } catch (error) {
      toast.error(error.message || 'Could not remove folder')
    }
  }

  const count = (id) => {
    const branch = folderIdsInBranch(folders, id)
    return branch ? items.filter((item) => branch.has(item.folderId)).length : 0
  }

  const renderBranch = (parent, depth = 0) =>
    folders
      .filter((folder) => (folder.parentId || null) === parent)
      .map((folder) => {
        const hasChildren = folders.some((child) => child.parentId === folder.id)
        const isOpen = expanded[folder.id] !== false
        const isMenuOpen = menuFolderId === folder.id

        return (
          <div key={folder.id}>
            <div
              className={`project-folder-row${selectedId === folder.id ? ' active' : ''}`}
            >
              <div
                className="project-folder-main"
                style={{ paddingLeft: 6 + depth * 14 }}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    className="project-folder-toggle"
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${folder.name}`}
                    aria-expanded={isOpen}
                    onClick={() =>
                      setExpanded((before) => ({
                        ...before,
                        [folder.id]: !isOpen,
                      }))
                    }
                  >
                    <ChevronSvg open={isOpen} />
                  </button>
                ) : (
                  <span className="project-folder-toggle-spacer" />
                )}
                <button
                  type="button"
                  className="project-folder-label"
                  aria-pressed={selectedId === folder.id}
                  title={folderPath(folders, folder.id)}
                  onClick={() => onSelect(folder.id)}
                >
                  <span className="project-folder-icon">
                    <FolderSvg open={isOpen} />
                  </span>
                  <span className="project-folder-title">{folder.name}</span>
                </button>
              </div>

              <div className="project-folder-tail">
                <span className="project-folder-badge">{count(folder.id)}</span>
                {isLead && (
                  <div
                    className={`project-folder-actions${isMenuOpen ? ' is-open' : ''}`}
                    ref={isMenuOpen ? menuRef : null}
                  >
                    <button
                      type="button"
                      className="project-folder-btn"
                      title={`Add subfolder to ${folder.name}`}
                      aria-label={`Add subfolder to ${folder.name}`}
                      onClick={() => openCreate(folder)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className={`project-folder-btn${isMenuOpen ? ' is-active' : ''}`}
                      title={`Actions for ${folder.name}`}
                      aria-label={`Actions for ${folder.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuFolderId((cur) => (cur === folder.id ? null : folder.id))
                      }}
                    >
                      ⋯
                    </button>
                    {isMenuOpen && (
                      <div
                        className="project-folder-dropdown"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openRename(folder)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => openCreate(folder)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                          Add subfolder
                        </button>
                        <button
                          type="button"
                          onClick={() => openMove(folder)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                          Move to…
                        </button>
                        <div className="project-folder-dropdown-divider" />
                        <button
                          type="button"
                          className="dropdown-item-danger"
                          onClick={() => remove(folder)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {hasChildren && isOpen && renderBranch(folder.id, depth + 1)}
          </div>
        )
      })

  return (
    <aside className="project-folder-tree" aria-label="Project folders">
      <div className="project-folder-head">
        <strong>Folders</strong>
        {isLead && (
          <button
            type="button"
            className="project-folder-head-add"
            onClick={() => openCreate()}
            aria-label="New folder"
            title="New folder"
          >
            +
          </button>
        )}
      </div>

      <button
        type="button"
        className={`project-folder-nav-item${selectedId === '' ? ' active' : ''}`}
        aria-pressed={selectedId === ''}
        onClick={() => onSelect('')}
      >
        <span className="project-folder-nav-left">
          <span className="project-folder-icon">
            <AllCasesSvg />
          </span>
          <span className="project-folder-name">All {typeLabel}</span>
        </span>
        <span className="project-folder-badge">{items.length}</span>
      </button>

      <div className="project-folder-branches">{renderBranch(null)}</div>

      <div className="project-folder-divider" />

      <button
        type="button"
        className={`project-folder-nav-item${selectedId === 'unfiled' ? ' active' : ''}`}
        aria-pressed={selectedId === 'unfiled'}
        onClick={() => onSelect('unfiled')}
      >
        <span className="project-folder-nav-left">
          <span className="project-folder-icon">
            <UnfiledSvg />
          </span>
          <span className="project-folder-name">Unfiled</span>
        </span>
        <span className="project-folder-badge">
          {items.filter((item) => !item.folderId).length}
        </span>
      </button>

      {/* Modal for Create / Rename / Move */}
      {modalMode && (
        <Modal
          title={
            modalMode === 'rename'
              ? `Rename “${targetFolder?.name}”`
              : modalMode === 'move'
              ? `Move “${targetFolder?.name}”`
              : parentFolder
              ? `New subfolder inside “${parentFolder.name}”`
              : 'New folder'
          }
          onClose={closeModal}
        >
          <form className="modal-form" onSubmit={handleSave}>
            {modalMode !== 'move' && (
              <label>
                Folder name <span className="required">*</span>
                <input
                  autoFocus
                  required
                  maxLength={120}
                  value={name}
                  placeholder="e.g. Authentication, Smoke, Regression…"
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            )}

            {(modalMode === 'create' || modalMode === 'move') && (
              <label>
                Location
                <select
                  value={parentId}
                  onChange={(event) => setParentId(event.target.value)}
                >
                  <option value="">Project root</option>
                  {folders
                    .filter(
                      (folder) =>
                        folder.id !== targetFolder?.id &&
                        (!targetFolder ||
                          !folderIdsInBranch(folders, targetFolder.id)?.has(folder.id)),
                    )
                    .map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folderPath(folders, folder.id)}
                      </option>
                    ))}
                </select>
              </label>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={saving || (modalMode !== 'move' && !name.trim())}
              >
                {saving
                  ? 'Saving…'
                  : modalMode === 'rename'
                  ? 'Rename'
                  : modalMode === 'move'
                  ? 'Move folder'
                  : 'Create folder'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </aside>
  )
}
