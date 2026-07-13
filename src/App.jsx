import { useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'
import { WorkspaceGate } from './components/WorkspaceGate'
import { OnboardingWizard } from './components/OnboardingWizard'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { useProjects } from './hooks/useProjects'
import { ConfirmProvider } from './context/ConfirmContext'
import { ToastProvider } from './context/ToastContext'
import { AuthPage } from './pages/AuthPage'
import { BackupPage } from './pages/BackupPage'
import { BugTrackerPage } from './pages/BugTrackerPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectReportsPage } from './pages/ProjectReportsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TestCaseDetailPage } from './pages/TestCaseDetailPage'
import { TestCasesPage } from './pages/TestCasesPage'
import { RequirementsPage } from './pages/RequirementsPage'
import { RequirementCoverageMatrixPage } from './pages/RequirementCoverageMatrixPage'
import { ProjectDashboardPage } from './pages/ProjectDashboardPage'
import { JoinPage } from './pages/JoinPage'
import { PublicReportPage } from './pages/PublicReportPage'
import { TestRunDetailPage } from './pages/TestRunDetailPage'
import { TestRunsPage } from './pages/TestRunsPage'
import { TestPlansPage } from './pages/TestPlansPage'
import { ActivityPage } from './pages/ActivityPage'
import { WorkspaceSettingsPage } from './pages/WorkspaceSettingsPage'
import './App.css'

const appRoutes = (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/projects" element={<ProjectsPage />} />
    <Route path="/reports" element={<ReportsPage />} />
    <Route path="/activity" element={<ActivityPage />} />
    <Route path="/backup" element={<BackupPage />} />
    <Route path="/projects/:projectId/dashboard" element={<ProjectDashboardPage />} />
    <Route path="/projects/:projectId/test-cases" element={<TestCasesPage />} />
    <Route path="/projects/:projectId/test-cases/:testCaseId" element={<TestCaseDetailPage />} />
    <Route path="/projects/:projectId/requirements" element={<RequirementsPage />} />
    <Route path="/projects/:projectId/requirements/:requirementId" element={<RequirementsPage />} />
    <Route path="/projects/:projectId/coverage-matrix" element={<RequirementCoverageMatrixPage />} />
    <Route path="/projects/:projectId/test-runs" element={<TestRunsPage />} />
    <Route path="/projects/:projectId/test-runs/:runId" element={<TestRunDetailPage />} />
    <Route path="/projects/:projectId/test-plans" element={<TestPlansPage />} />
    <Route path="/projects/:projectId/bugs" element={<BugTrackerPage />} />
    <Route path="/projects/:projectId/reports" element={<ProjectReportsPage />} />
    <Route path="/projects/:projectId/settings" element={<SettingsPage />} />
    <Route path="/workspace/settings" element={<WorkspaceSettingsPage />} />
    <Route path="/join/:token" element={<JoinPage />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
)

function AppShell() {
  const { authUser, loading } = useAuth()
  const hash = window.location.hash

  // Public report links must be viewable with zero authentication - external
  // stakeholders may never have an account. Bypass the auth gate entirely.
  if (hash.startsWith('#/report/')) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/report/:shareToken" element={<PublicReportPage />} />
          <Route path="*" element={<Navigate to="/report/invalid" replace />} />
        </Routes>
      </HashRouter>
    )
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-card" role="status" aria-live="polite">
          <span className="app-loading-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 11 2 2 4-4" />
            </svg>
          </span>
          <div className="app-loading-spinner" aria-label="Loading" />
          <div>
            <strong>QA Lab</strong>
            <p className="app-loading-text">Preparing your workspace</p>
          </div>
        </div>
      </div>
    )
  }

  if (!authUser) {
    // Same problem as the public report route above: JoinPage needs to be
    // reachable before login so it can show its "sign in to continue"
    // prompt, then finish the join automatically once authUser appears.
    if (hash.startsWith('#/join/')) {
      return (
        <HashRouter>
          <Routes>
            <Route path="/join/:token" element={<JoinPage />} />
            <Route path="*" element={<Navigate to="/join/invalid" replace />} />
          </Routes>
        </HashRouter>
      )
    }
    return <AuthPage />
  }

  return (
    <WorkspaceGate>
      <HashRouter>
        <ErrorBoundary>
          <Layout>
            {appRoutes}
          </Layout>
        </ErrorBoundary>
      </HashRouter>
      <OnboardingGate />
    </WorkspaceGate>
  )
}

// Shown once for a brand-new workspace with no projects yet; dismissing it
// (finish or skip) is remembered in localStorage so it never reappears.
function OnboardingGate() {
  const { projects, loading } = useProjects()
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem('qa_onboarding_dismissed'))

  if (dismissed || loading || projects.length > 0) return null

  return (
    <OnboardingWizard onComplete={() => {
      setDismissed(true)
      localStorage.setItem('qa_onboarding_dismissed', '1')
    }} />
  )
}

export function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}

export default App
