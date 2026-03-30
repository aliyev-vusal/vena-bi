import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { DataSource } from '../App'

interface ETLStep {
  id: string
  kind: 'rename' | 'cast' | 'remove' | 'filter_not_null'
  column: string
  newName?: string
  castType?: string
  label: string
}

interface ColumnStat {
  name: string
  dataType: string
  nonNull: number
  total: number
  distinct: number
  sample: unknown[]
}

interface PreviewCol { name: string; dataType: string }

interface Props {
  source: DataSource
  onClose: () => void
  onApplied: (updated: DataSource) => void
}

const CAST_TYPES = ['VARCHAR', 'INTEGER', 'BIGINT', 'DOUBLE', 'BOOLEAN', 'DATE', 'TIMESTAMP']

function typeBadgeColor(dt: string): { bg: string; color: string; label: string } {
  const t = dt.toUpperCase()
  if (['INTEGER','BIGINT','DOUBLE','FLOAT','DECIMAL','NUMERIC','INT','REAL','HUGEINT','SMALLINT','TINYINT'].some(p => t === p || t.startsWith(p + '(')))
    return { bg: 'rgba(52,211,153,0.15)', color: '#34d399', label: '123' }
  if (t.startsWith('DATE') || t.startsWith('TIMESTAMP'))
    return { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'dt' }
  if (t === 'BOOLEAN')
    return { bg: 'rgba(251,113,133,0.15)', color: '#fb7185', label: 'T/F' }
  return { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa', label: 'ABC' }
}

export function PowerQueryWindow({ source, onClose, onApplied }: Props): React.JSX.Element {
  const [steps, setSteps] = useState<ETLStep[]>([])
  const [preview, setPreview] = useState<{ columns: PreviewCol[]; rows: unknown[][] } | null>(null)
  const [stats, setStats] = useState<ColumnStat[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [selectedCol, setSelectedCol] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ col: string; value: string } | null>(null)
  const [colMenu, setColMenu] = useState<{ col: string; x: number; y: number } | null>(null)
  const stepsRef = useRef(steps)
  stepsRef.current = steps

  // Load preview whenever steps change — debounced 180 ms so rapid additions don't spam IPC
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      window.api.applyETLPreview(source.tableName, source.filePath, steps as ETLStep[])
        .then((result) => {
          if (cancelled) return
          if (result.success) setPreview({ columns: result.columns, rows: result.rows })
          setLoading(false)
        })
        .catch(() => { if (!cancelled) setLoading(false) })
    }, 180)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [steps, source.tableName, source.filePath])

  // Load column stats once on open
  useEffect(() => {
    window.api.getColumnStats(source.tableName).then((result) => {
      if (result.success) setStats(result.stats)
    })
  }, [source.tableName])

  // Close column menu when clicking elsewhere
  useEffect(() => {
    const handler = (): void => setColMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  const addStep = useCallback((step: Omit<ETLStep, 'id'>): void => {
    setSteps((prev) => [...prev, { ...step, id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 5)}` }])
    setColMenu(null)
  }, [])

  const removeStep = useCallback((id: string): void => {
    setSteps((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const handleRenameConfirm = (): void => {
    if (!renaming || !renaming.value.trim() || renaming.value.trim() === renaming.col) {
      setRenaming(null)
      return
    }
    addStep({
      kind: 'rename',
      column: renaming.col,
      newName: renaming.value.trim(),
      label: `Renamed "${renaming.col}" → "${renaming.value.trim()}"`
    })
    setRenaming(null)
  }

  const handleApply = async (): Promise<void> => {
    setApplying(true)
    const result = await window.api.applyETLSteps(source.tableName, source.filePath, steps as ETLStep[])
    setApplying(false)
    if (result.success) {
      onApplied({ ...source, fields: result.fields, rowCount: result.rowCount })
      onClose()
    }
  }

  // Column name in current preview (accounting for renames)
  const getCurrentName = (origName: string): string => {
    const renameSteps = steps.filter((s) => s.kind === 'rename' && s.column === origName)
    return renameSteps.length > 0 ? renameSteps[renameSteps.length - 1].newName! : origName
  }

  const isRemoved = (col: string): boolean =>
    steps.some((s) => s.kind === 'remove' && s.column === col)

  const selectedColStat = stats.find((s) => s.name === selectedCol)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '92vw', height: '88vh',
          background: '#161616',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div style={{
          height: 48, flexShrink: 0,
          background: '#1e1e1e',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12
        }}>
          <svg width="16" height="16" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e4' }}>Power Query — </span>
          <span style={{ fontSize: 13, color: '#888' }}>{source.fileName}</span>
          <span style={{
            marginLeft: 4, fontSize: 11, color: '#555',
            background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 10
          }}>
            {source.rowCount.toLocaleString()} rows · {source.fields.length} columns
          </span>
          <div style={{ flex: 1 }} />
          {steps.length > 0 && (
            <button
              onClick={() => setSteps([])}
              style={{
                padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#888', cursor: 'pointer', fontSize: 12
              }}
            >
              Reset all
            </button>
          )}
          <button
            onClick={handleApply}
            disabled={applying}
            style={{
              padding: '6px 16px', borderRadius: 6, border: 'none',
              background: applying ? '#1d4ed8' : '#2563eb',
              color: '#fff', cursor: applying ? 'wait' : 'pointer',
              fontSize: 12, fontWeight: 600, opacity: applying ? 0.7 : 1
            }}
          >
            {applying ? 'Applying…' : `Apply & Close${steps.length > 0 ? ` (${steps.length} steps)` : ''}`}
          </button>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Applied Steps panel */}
          <div style={{
            width: 220, flexShrink: 0,
            background: '#1a1a1a',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{
              padding: '10px 14px 8px',
              fontSize: 10, fontWeight: 700, color: '#555',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
              Applied Steps
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
              {/* Source step (always present) */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 6,
                background: 'rgba(59,130,246,0.1)', marginBottom: 4
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#93c5fd', flex: 1 }}>Source</span>
              </div>
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 8px', borderRadius: 6, marginBottom: 2,
                    background: 'rgba(255,255,255,0.04)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                >
                  <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 8, color: '#888' }}>{i + 1}</span>
                  </span>
                  <span style={{ fontSize: 11, color: '#bbb', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={step.label}>
                    {step.label}
                  </span>
                  <button
                    onClick={() => removeStep(step.id)}
                    style={{ border: 'none', background: 'transparent', color: '#555', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#555' }}
                    title="Remove step"
                  >
                    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
              {steps.length === 0 && (
                <p style={{ fontSize: 11, color: '#444', padding: '8px 8px', textAlign: 'center', marginTop: 8 }}>
                  No transformations yet.<br/>Right-click a column header.
                </p>
              )}
            </div>
          </div>

          {/* Data preview */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {loading && (
              <div style={{ position: 'absolute', top: 56, left: 220, right: 0, height: 2, background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', zIndex: 5 }} />
            )}

            {/* Column stats bar (for selected column) */}
            {selectedColStat && (
              <div style={{
                flexShrink: 0, padding: '8px 16px',
                background: '#1e1e1e', borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 20
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#bbb' }}>{selectedColStat.name}</span>
                <Stat label="Type" value={selectedColStat.dataType} />
                <Stat label="Non-null" value={`${selectedColStat.nonNull.toLocaleString()} / ${selectedColStat.total.toLocaleString()}`} />
                <Stat label="Distinct" value={selectedColStat.distinct.toLocaleString()} />
                <Stat label="Null %" value={`${((1 - selectedColStat.nonNull / Math.max(selectedColStat.total, 1)) * 100).toFixed(1)}%`} />
                {selectedColStat.sample.length > 0 && (
                  <Stat label="Sample" value={selectedColStat.sample.map(String).join(', ')} />
                )}
              </div>
            )}

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto', fontSize: 12 }}>
              {preview && (
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                    <tr>
                      {/* Row number header */}
                      <th style={{
                        width: 44, padding: '0 8px', textAlign: 'right',
                        background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.08)',
                        color: '#444', fontWeight: 400, fontSize: 10
                      }}>#</th>
                      {preview.columns.map((col) => {
                        const badge = typeBadgeColor(col.dataType)
                        const isSelected = selectedCol === col.name
                        return (
                          <th
                            key={col.name}
                            onClick={() => setSelectedCol(isSelected ? null : col.name)}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              setColMenu({ col: col.name, x: e.clientX, y: e.clientY })
                            }}
                            style={{
                              padding: '0 12px', height: 36,
                              background: isSelected ? 'rgba(59,130,246,0.12)' : '#1a1a1a',
                              borderBottom: '1px solid rgba(255,255,255,0.08)',
                              borderLeft: '1px solid rgba(255,255,255,0.04)',
                              color: isSelected ? '#93c5fd' : '#bbb',
                              fontWeight: 500, textAlign: 'left',
                              whiteSpace: 'nowrap', cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'background 0.1s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontSize: 9, fontWeight: 700, fontFamily: 'monospace',
                                padding: '1px 4px', borderRadius: 3,
                                background: badge.bg, color: badge.color
                              }}>
                                {badge.label}
                              </span>
                              {renaming?.col === col.name ? (
                                <input
                                  autoFocus
                                  value={renaming.value}
                                  onChange={(e) => setRenaming({ col: col.name, value: e.target.value })}
                                  onBlur={handleRenameConfirm}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameConfirm()
                                    if (e.key === 'Escape') setRenaming(null)
                                    e.stopPropagation()
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    width: 120, fontSize: 12, fontWeight: 500,
                                    background: 'rgba(59,130,246,0.15)',
                                    border: '1px solid rgba(59,130,246,0.5)',
                                    borderRadius: 4, padding: '1px 6px', color: '#e4e4e4',
                                    outline: 'none'
                                  }}
                                />
                              ) : (
                                <span onDoubleClick={(e) => { e.stopPropagation(); setRenaming({ col: col.name, value: getCurrentName(col.name) }) }}>
                                  {getCurrentName(col.name)}
                                </span>
                              )}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                      >
                        <td style={{
                          padding: '0 8px', height: 28, textAlign: 'right',
                          color: '#333', fontSize: 10, borderBottom: '1px solid rgba(255,255,255,0.03)',
                          userSelect: 'none'
                        }}>
                          {ri + 1}
                        </td>
                        {row.map((cell, ci) => {
                          const colName = preview.columns[ci]?.name
                          const isSel = colName !== undefined && selectedCol === colName
                          return (
                            <td
                              key={ci}
                              style={{
                                padding: '0 12px', height: 28,
                                color: cell == null ? '#3a3a3a' : '#ccc',
                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                borderLeft: '1px solid rgba(255,255,255,0.02)',
                                whiteSpace: 'nowrap', overflow: 'hidden',
                                maxWidth: 240, textOverflow: 'ellipsis',
                                background: isSel ? 'rgba(59,130,246,0.05)' : 'transparent',
                                fontStyle: cell == null ? 'italic' : 'normal'
                              }}
                            >
                              {cell == null ? 'null' : String(cell)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom status */}
            <div style={{
              flexShrink: 0, height: 28,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: '#1a1a1a', display: 'flex', alignItems: 'center',
              padding: '0 16px', gap: 16
            }}>
              <span style={{ fontSize: 10, color: '#555' }}>
                {preview ? `${preview.rows.length} rows` : 'Loading…'}
              </span>
              {steps.length > 0 && (
                <span style={{ fontSize: 10, color: '#3b82f6' }}>
                  {steps.length} transformation{steps.length !== 1 ? 's' : ''} applied
                </span>
              )}
              <span style={{ fontSize: 10, color: '#444' }}>
                Double-click column header to rename · Right-click for more options
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Column context menu */}
      {colMenu && (
        <ColumnMenu
          col={colMenu.col}
          x={colMenu.x}
          y={colMenu.y}
          colType={preview?.columns.find(c => c.name === colMenu.col)?.dataType ?? ''}
          onRename={() => { setRenaming({ col: colMenu.col, value: getCurrentName(colMenu.col) }); setColMenu(null) }}
          onCast={(type) => addStep({ kind: 'cast', column: colMenu.col, castType: type, label: `Changed type of "${colMenu.col}" to ${type}` })}
          onRemove={() => addStep({ kind: 'remove', column: colMenu.col, label: `Removed column "${colMenu.col}"` })}
          onFilterNotNull={() => addStep({ kind: 'filter_not_null', column: colMenu.col, label: `Removed null rows in "${colMenu.col}"` })}
          onClose={() => setColMenu(null)}
        />
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#bbb', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

function ColumnMenu({ col, x, y, colType, onRename, onCast, onRemove, onFilterNotNull, onClose }: {
  col: string; x: number; y: number; colType: string
  onRename: () => void
  onCast: (type: string) => void
  onRemove: () => void
  onFilterNotNull: () => void
  onClose: () => void
}): React.JSX.Element {
  const [showCast, setShowCast] = useState(false)

  // Position the menu within viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - 240),
    width: 190,
    background: '#202020',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    zIndex: 2000,
    overflow: 'hidden',
    fontSize: 12
  }

  const menuItem = (label: string, icon: React.ReactNode, onClick: (e: React.MouseEvent) => void, danger = false): React.JSX.Element => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e) }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '7px 12px',
        border: 'none', background: 'transparent',
        color: danger ? '#f87171' : '#ccc', cursor: 'pointer', textAlign: 'left',
        fontSize: 12, transition: 'background 0.1s'
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = danger ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.07)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      {icon}
      {label}
    </button>
  )

  const iconEdit = <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
  const iconType = <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
  const iconFilter = <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
  const iconX = <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>

  return (
    <div style={menuStyle} onClick={(e) => e.stopPropagation()}>
      <div style={{ padding: '6px 12px 4px', fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {col}
      </div>

      {menuItem('Rename column', iconEdit, () => onRename())}

      {/* Change type sub-menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={(e) => { e.stopPropagation(); setShowCast(!showCast) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '7px 12px',
            border: 'none', background: 'transparent',
            color: '#ccc', cursor: 'pointer', textAlign: 'left', fontSize: 12
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          {iconType}
          Change type
          <svg style={{ marginLeft: 'auto' }} width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </button>
        {showCast && (
          <div style={{
            position: 'absolute', left: '100%', top: 0,
            background: '#202020', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, width: 140, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 2001
          }}>
            {CAST_TYPES.map((t) => (
              <button
                key={t}
                onClick={(e) => { e.stopPropagation(); onCast(t); setShowCast(false) }}
                style={{
                  display: 'block', width: '100%', padding: '6px 12px',
                  border: 'none', background: colType?.toUpperCase() === t ? 'rgba(59,130,246,0.2)' : 'transparent',
                  color: colType?.toUpperCase() === t ? '#93c5fd' : '#ccc',
                  cursor: 'pointer', textAlign: 'left', fontSize: 11,
                  fontFamily: 'monospace'
                }}
                onMouseEnter={(e) => { if (colType?.toUpperCase() !== t) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={(e) => { if (colType?.toUpperCase() !== t) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

      {menuItem('Remove null rows', iconFilter, () => onFilterNotNull())}
      {menuItem('Remove column', iconX, () => onRemove(), true)}
    </div>
  )
}
