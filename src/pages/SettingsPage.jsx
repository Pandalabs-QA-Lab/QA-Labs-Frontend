import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Card,
  Title,
  Text,
  Badge,
  Avatar,
  Select,
  ActionIcon,
  Divider,
  CopyButton,
  Tooltip,
  Alert,
  Timeline,
} from '@mantine/core'
import { XIcon, CheckIcon } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { useConfirm } from '../context/useConfirm'
import { useToast } from '../context/useToast'
import { useProjects } from '../hooks/useProjects'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { useActivity } from '../hooks/useActivity'
import { useUserRole } from '../hooks/useUserRole'
import { useTestCases } from '../hooks/useTestCases'
import { useBugs } from '../hooks/useBugs'
import { useTestRuns } from '../hooks/useTestRuns'
import { getJiraSettings, saveJiraSettings } from '../utils/storage'
import { isFirebaseEnabled } from '../utils/firebase'
import { getOrCreateProjectInviteToken, revokeProjectInviteToken } from '../utils/remoteStorage'

export function SettingsPage() {
  const { projectId } = useParams()
  const { projects, updateProject, removeProject } = useProjects()
  const { members, addMember, updateMember } = useTeamMembers()
  const { testCases } = useTestCases(projectId)
  const { bugs } = useBugs(projectId)
  const { runs } = useTestRuns(projectId)
  const { getActivitiesByProject } = useActivity()
  const { isLead } = useUserRole()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()

  const project = projects.find((p) => p.id === projectId)
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [newMemberName, setNewMemberName] = useState('')
  const [saved, setSaved] = useState(false)

  // Jira integration settings
  const [jiraSettings, setJiraSettings] = useState(() => getJiraSettings())
  const [jiraSaved, setJiraSaved] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const handleGenerateInvite = async () => {
    if (!isFirebaseEnabled) { toast.error('Invite links require Firebase.'); return }
    setInviteLoading(true)
    try {
      const token = await getOrCreateProjectInviteToken(projectId)
      const link = `${window.location.origin}${window.location.pathname}#/join/${token}`
      setInviteLink(link)
      await navigator.clipboard.writeText(link)
      toast.success('Invite link copied to clipboard!')
    } catch {
      toast.error('Failed to generate invite link.')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRevokeInvite = async () => {
    const ok = await confirm({ title: 'Revoke invite link?', message: 'The current invite link will stop working. You can generate a new one anytime.', confirmLabel: 'Revoke', danger: true })
    if (!ok) return
    await revokeProjectInviteToken(projectId)
    setInviteLink('')
    toast.success('Invite link revoked.')
  }

  const projectActivities = getActivitiesByProject(projectId).slice(0, 10)

  if (!project) {
    return (
      <section className="empty-state">
        <h2>Project not found</h2>
      </section>
    )
  }

  const memberIds = project.memberIds ?? []
  const projectMembers = members.filter((m) => memberIds.includes(m.id))
  const nonMembers = members.filter((m) => !memberIds.includes(m.id))

  const handleSave = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    updateProject({ ...project, name: name.trim(), description: description.trim() })
    setSaved(true)
    toast.success('Project settings saved')
    setTimeout(() => setSaved(false), 2000)
  }

  const handleJiraSave = (e) => {
    e.preventDefault()
    const trimmedDomain = jiraSettings.domain.trim().replace(/\/+$/, '') // strip trailing slash
    const trimmedKey = jiraSettings.projectKey.trim().toUpperCase()
    const cleaned = { domain: trimmedDomain, projectKey: trimmedKey }
    saveJiraSettings(cleaned)
    setJiraSettings(cleaned)
    setJiraSaved(true)
    toast.success('Jira settings saved')
    setTimeout(() => setJiraSaved(false), 2000)
  }

  const addExistingMember = (memberId) =>
    updateProject({ ...project, memberIds: [...memberIds, memberId] })

  const removeMemberFromProject = (memberId) =>
    updateProject({ ...project, memberIds: memberIds.filter((id) => id !== memberId) })

  // Create a brand-new global member AND attach them to this project atomically
  const handleAddNew = (e) => {
    e.preventDefault()
    const trimmed = newMemberName.trim()
    if (!trimmed) return
    const newMember = addMember(trimmed)
    updateProject({ ...project, memberIds: [...memberIds, newMember.id] })
    setNewMemberName('')
  }

  const handleDelete = async () => {
    const tcCount = testCases.length
    const bugCount = bugs.length
    const runCount = runs.length
    const ok = await confirm({
      title: 'Delete project?',
      message: `All data in "${project.name}" will be permanently deleted and cannot be recovered.`,
      details: [
        `${tcCount} test case${tcCount !== 1 ? 's' : ''}`,
        `${bugCount} bug${bugCount !== 1 ? 's' : ''}`,
        `${runCount} test run${runCount !== 1 ? 's' : ''}`,
      ],
      confirmLabel: 'Delete project',
      danger: true,
      requireText: project.name,
    })
    if (ok) {
      removeProject(project.id)
      navigate('/projects')
    }
  }

  const roleData = [
    { value: 'Viewer', label: 'Viewer' },
    { value: 'Tester', label: 'Tester' },
    { value: 'QA Lead', label: 'QA Lead' },
  ]

  const nonMemberSelectData = nonMembers.map((m) => ({
    value: m.id,
    label: m.name,
  }))

  return (
    <>
      <PageHeader backTo={`/projects`} title="Settings" description={`Configure ${project.name}`} />

      {/* ─── Project Details ─── */}
      <Card shadow="sm" padding="lg" radius="md" withBorder mb="md" bg="var(--surface)" style={{ borderColor: 'var(--border)' }}>
        <Title order={4} mb="md" style={{ fontFamily: 'var(--heading)', color: 'var(--text-strong)' }}>Project details</Title>
        <form onSubmit={handleSave}>
          <Stack gap="sm">
            <TextInput
              label="Name"
              withAsterisk
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isLead}
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              disabled={!isLead}
              autosize
              minRows={2}
            />
            <Group justify="flex-end">
              <Button type="submit" disabled={!isLead} color={saved ? 'green' : 'accent'}>
                {saved ? '✓ Saved' : 'Save changes'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      {/* ─── Team Members ─── */}
      <Card shadow="sm" padding="lg" radius="md" withBorder mb="md" bg="var(--surface)" style={{ borderColor: 'var(--border)' }}>
        <Title order={4} mb="md" style={{ fontFamily: 'var(--heading)', color: 'var(--text-strong)' }}>Team members</Title>

        <Text size="sm" fw={500} c="dimmed" mb="xs">Assigned to this project</Text>

        {projectMembers.length === 0 ? (
          <Text size="sm" c="dimmed" fs="italic">No members assigned yet.</Text>
        ) : (
          <Stack gap="xs">
            {projectMembers.map((m) => (
              <Group key={m.id} justify="space-between" p="xs" style={{ borderRadius: 'var(--radius-sm)', background: 'var(--soft-bg)', border: '1px solid var(--border)' }}>
                <Group gap="sm">
                  <Avatar color="accent" radius="xl" size="sm">
                    {m.name.slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Text size="sm" fw={500}>{m.name}</Text>
                  {m.uid && (
                    <Badge variant="light" color="accent" size="xs">
                      Workspace user
                    </Badge>
                  )}
                </Group>
                <Group gap="xs">
                  <Select
                    data={roleData}
                    value={m.role || 'Viewer'}
                    onChange={(val) => updateMember({ ...m, role: val })}
                    disabled={!isLead}
                    size="xs"
                    w={120}
                    comboboxProps={{ withinPortal: true }}
                  />
                  {isLead && (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      aria-label={`Remove ${m.name}`}
                      onClick={() => removeMemberFromProject(m.id)}
                    >
                      <XIcon width={14} height={14} />
                    </ActionIcon>
                  )}
                </Group>
              </Group>
            ))}
          </Stack>
        )}

        {isLead && (
          <>
            <Divider my="md" />
            <Text size="sm" fw={500} c="dimmed" mb="xs">Assign team members</Text>

            <Stack gap="sm">
              {nonMembers.length > 0 && (
                <Select
                  label="Choose from existing team"
                  placeholder="Select member…"
                  data={nonMemberSelectData}
                  value={null}
                  onChange={(val) => { if (val) addExistingMember(val) }}
                  searchable
                  clearable
                  comboboxProps={{ withinPortal: true }}
                />
              )}

              <form onSubmit={handleAddNew}>
                <TextInput
                  label="Create & assign new member"
                  placeholder="Name (e.g. John Doe)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  rightSection={
                    <Button
                      type="submit"
                      size="compact-xs"
                      variant="light"
                      disabled={!newMemberName.trim()}
                    >
                      Add
                    </Button>
                  }
                  rightSectionWidth={60}
                />
              </form>
            </Stack>
          </>
        )}
      </Card>

      {/* ─── Invite to Project ─── */}
      {isLead && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mb="md" bg="var(--surface)" style={{ borderColor: 'var(--border)' }}>
          <Title order={4} mb="xs" style={{ fontFamily: 'var(--heading)', color: 'var(--text-strong)' }}>Invite to project</Title>
          <Text size="xs" c="dimmed" mb="md">
            Share this link to invite teammates directly into <strong>{project.name}</strong>. They'll be added as Viewer and can only access this project.
          </Text>

          <Group gap="sm" wrap="wrap">
            {inviteLink && (
              <TextInput
                readOnly
                value={inviteLink}
                style={{ flex: '1 1 300px' }}
                styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
                onClick={(e) => e.target.select()}
              />
            )}
            <CopyButton value={inviteLink} timeout={2000}>
              {({ copied, copy }) => (
                <Button
                  color={copied ? 'green' : 'accent'}
                  loading={inviteLoading}
                  onClick={inviteLink ? copy : handleGenerateInvite}
                >
                  {inviteLoading ? 'Generating…' : copied ? 'Copied!' : inviteLink ? 'Copy link' : 'Generate invite link'}
                </Button>
              )}
            </CopyButton>
            {inviteLink && (
              <Button variant="light" color="red" onClick={handleRevokeInvite}>
                Revoke
              </Button>
            )}
          </Group>
        </Card>
      )}

      {/* ─── Jira Integration ─── */}
      <Card shadow="sm" padding="lg" radius="md" withBorder mb="md" bg="var(--surface)" style={{ borderColor: 'var(--border)' }}>
        <Group gap="xs" mb="md">
          <Title order={4} style={{ fontFamily: 'var(--heading)', color: 'var(--text-strong)' }}>🔗 Jira Integration</Title>
          {jiraSettings.domain && jiraSettings.projectKey && (
            <Badge color="green" variant="light" size="sm" leftSection="✓">
              Active
            </Badge>
          )}
        </Group>

        <Text size="xs" c="dimmed" mb="md">
          Enter your Jira domain and project key once. A <strong>"Push to Jira"</strong> button will appear on every bug so your team can send bugs to Jira with one click — no copy-pasting.
        </Text>

        <form onSubmit={handleJiraSave}>
          <Stack gap="sm">
            <TextInput
              label="Jira Domain"
              description="Do not include https:// — just the domain."
              value={jiraSettings.domain}
              onChange={(e) => setJiraSettings((s) => ({ ...s, domain: e.target.value }))}
              placeholder="e.g. mycompany.atlassian.net"
            />
            <TextInput
              label="Project Key"
              description="The short code in your Jira issue IDs (e.g. PROJ in PROJ-123)."
              value={jiraSettings.projectKey}
              onChange={(e) => setJiraSettings((s) => ({ ...s, projectKey: e.target.value }))}
              placeholder="e.g. PROJ"
              styles={{ input: { textTransform: 'uppercase' } }}
            />
            <Group justify="flex-start" gap="sm">
              <Button
                type="submit"
                disabled={!jiraSettings.domain.trim() || !jiraSettings.projectKey.trim()}
                color={jiraSaved ? 'green' : 'accent'}
              >
                {jiraSaved ? '✓ Saved' : 'Save Jira settings'}
              </Button>
              {jiraSettings.domain && jiraSettings.projectKey && (
                <Button
                  variant="subtle"
                  color="gray"
                  onClick={() => {
                    const cleared = { domain: '', projectKey: '' }
                    saveJiraSettings(cleared)
                    setJiraSettings(cleared)
                    toast.success('Jira integration disconnected')
                  }}
                >
                  Disconnect
                </Button>
              )}
            </Group>
          </Stack>
        </form>
      </Card>

      {/* ─── Recent Activity ─── */}
      <Card shadow="sm" padding="lg" radius="md" withBorder mb="md" bg="var(--surface)" style={{ borderColor: 'var(--border)' }}>
        <Group justify="space-between" mb="md">
          <Title order={4} style={{ fontFamily: 'var(--heading)', color: 'var(--text-strong)' }}>Recent Activity</Title>
          <Text component={Link} to={`/activity?projectId=${projectId}`} size="sm" style={{ textDecoration: 'none', color: 'var(--accent)' }}>
            View all activity →
          </Text>
        </Group>

        {projectActivities.length === 0 ? (
          <Text size="sm" c="dimmed" fs="italic">No recent activity for this project.</Text>
        ) : (
          <Timeline active={projectActivities.length - 1} bulletSize={20} lineWidth={2} color="accent">
            {projectActivities.map((act) => (
              <Timeline.Item key={act.id} title={<Text size="xs" fw={700} style={{ color: 'var(--text-strong)' }}>{act.title}</Text>}>
                <Text c="dimmed" style={{ fontSize: '11.5px', marginTop: '2px' }}>
                  By <Text span fw={500} inherit>{act.actorName}</Text> {act.details ? `— ${act.details}` : ''}
                </Text>
                <Text mt={2} c="dimmed" style={{ fontSize: '10.5px' }}>
                  {new Date(act.createdAt).toLocaleString()}
                </Text>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Card>

      {/* ─── Danger Zone ─── */}
      {isLead && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mb="md" style={{ borderColor: 'var(--danger)' }} bg="var(--surface)">
          <Title order={4} c="red" mb="sm" style={{ fontFamily: 'var(--heading)' }}>Danger zone</Title>
          <Alert variant="light" color="red" title="Delete this project" mb="sm">
            Permanently removes all test cases, bugs, and runs. This action cannot be undone.
          </Alert>
          <Button color="red" variant="filled" onClick={handleDelete}>
            Delete project
          </Button>
        </Card>
      )}
    </>
  )
}
