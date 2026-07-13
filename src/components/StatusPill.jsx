export function StatusPill({ tone = 'neutral', children, style }) {
  return <span className={`status-pill status-pill--${tone}`} style={style}>{children}</span>
}
