import { PageHeader } from './PageHeader'

export function DataLoadState({ title, loading, error, onRetry }) {
  return <>
    <PageHeader title={title} />
    <section className="panel" style={{ padding: 24 }} aria-busy={loading}>
      {error ? <>
        <p role="alert">Could not load workspace data. {error}</p>
        <button className="secondary-button" type="button" onClick={onRetry} disabled={loading}>Retry</button>
      </> : <p role="status">Loading workspace data…</p>}
    </section>
  </>
}
