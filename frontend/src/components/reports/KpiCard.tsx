// src/components/reports/KpiCard.tsx
import { ReactNode } from 'react'

interface Props {
  label:     string
  value:     ReactNode
  hint?:     ReactNode
  hintColor?: 'success' | 'warning' | 'danger' | 'muted'
  icon?:     ReactNode
}

export default function KpiCard({ label, value, hint, hintColor = 'muted', icon }: Props) {
  const hintCSSColor =
    hintColor === 'success' ? 'var(--green)'
    : hintColor === 'warning' ? 'var(--yellow, #f5b945)'
    : hintColor === 'danger'  ? 'var(--red)'
    : 'var(--text-muted)'

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '0.85rem 1rem',
    }}>
      <p style={{
        fontSize: '0.68rem',
        color: 'var(--text-muted)',
        margin: '0 0 0.3rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>{label}</p>

      <div style={{
        fontSize: '1.15rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        margin: 0,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>

      {hint && (
        <p style={{
          fontSize: '0.7rem',
          color: hintCSSColor,
          margin: '0.35rem 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          {icon}
          <span>{hint}</span>
        </p>
      )}
    </div>
  )
}
