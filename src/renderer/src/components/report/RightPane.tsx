import React, { useState, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { VIS_META, type Visual, type VisualType, type VisualFormat } from '../../types/visual'
import type { AxisField, DataSource, Measure, Relationship } from '../../App'
import { MeasureModal } from '../MeasureModal'
import { RelationshipModal } from '../RelationshipModal'

type PaneTab = 'build' | 'format'

// ── Visualization color palette (per category) ────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  bar:         '#3b82f6',
  line:        '#06b6d4',
  proportion:  '#8b5cf6',
  statistical: '#10b981',
  tabular:     '#f59e0b',
  other:       '#ec4899'
}

// ── VIS entries with SVG icons ────────────────────────────────────────────────

interface VisEntry { type: VisualType; icon: (color: string) => React.ReactNode }

const VIS_ENTRIES: VisEntry[] = [
  { type: 'clusteredBar',    icon: (c) => <svg viewBox="0 0 18 18" fill={c}><rect x="1" y="4" width="6" height="3" rx=".5"/><rect x="1" y="9" width="11" height="3" rx=".5" opacity=".75"/><rect x="1" y="14" width="8" height="3" rx=".5" opacity=".5"/></svg> },
  { type: 'stackedBar',      icon: (c) => <svg viewBox="0 0 18 18" fill={c}><rect x="1" y="4" width="4" height="3" rx=".5"/><rect x="5.5" y="4" width="5" height="3" rx=".5" opacity=".6"/><rect x="1" y="9" width="6" height="3" rx=".5"/><rect x="7.5" y="9" width="4" height="3" rx=".5" opacity=".6"/><rect x="1" y="14" width="3" height="3" rx=".5"/><rect x="4.5" y="14" width="7" height="3" rx=".5" opacity=".6"/></svg> },
  { type: 'bar100',          icon: (c) => <svg viewBox="0 0 18 18" fill={c}><rect x="1" y="4" width="4" height="3" rx=".5"/><rect x="5.5" y="4" width="5" height="3" rx=".5" opacity=".6"/><rect x="11" y="4" width="6" height="3" rx=".5" opacity=".35"/><rect x="1" y="9" width="6" height="3" rx=".5"/><rect x="7.5" y="9" width="4" height="3" rx=".5" opacity=".6"/><rect x="12" y="9" width="5" height="3" rx=".5" opacity=".35"/></svg> },
  { type: 'clusteredColumn', icon: (c) => <svg viewBox="0 0 18 18" fill={c}><rect x="2" y="9" width="3" height="8" rx=".5"/><rect x="7.5" y="5" width="3" height="12" rx=".5" opacity=".75"/><rect x="13" y="12" width="3" height="5" rx=".5" opacity=".5"/></svg> },
  { type: 'stackedColumn',   icon: (c) => <svg viewBox="0 0 18 18" fill={c}><rect x="2" y="12" width="3" height="5" rx=".5"/><rect x="2" y="8" width="3" height="3.5" rx=".5" opacity=".6"/><rect x="7.5" y="8" width="3" height="9" rx=".5"/><rect x="7.5" y="4" width="3" height="3.5" rx=".5" opacity=".6"/><rect x="13" y="10" width="3" height="7" rx=".5"/><rect x="13" y="6" width="3" height="3.5" rx=".5" opacity=".6"/></svg> },
  { type: 'column100',       icon: (c) => <svg viewBox="0 0 18 18" fill={c}><rect x="2" y="4" width="3" height="13" rx=".5"/><rect x="2" y="4" width="3" height="6" rx=".5" opacity=".5"/><rect x="7.5" y="4" width="3" height="13" rx=".5"/><rect x="7.5" y="4" width="3" height="8" rx=".5" opacity=".5"/><rect x="13" y="4" width="3" height="13" rx=".5"/><rect x="13" y="4" width="3" height="4" rx=".5" opacity=".5"/></svg> },
  { type: 'line',            icon: (c) => <svg viewBox="0 0 18 18" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,14 6,8 10,11 16,4"/></svg> },
  { type: 'area',            icon: (c) => <svg viewBox="0 0 18 18"><path d="M2 14 L6 8 L10 11 L16 4 L16 17 L2 17Z" fill={c} opacity=".35"/><polyline points="2,14 6,8 10,11 16,4" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { type: 'stackedArea',     icon: (c) => <svg viewBox="0 0 18 18" fill={c}><path d="M2 17 L2 11 L6 9 L10 12 L16 8 L16 17Z" opacity=".45"/><path d="M2 11 L6 7 L10 9 L16 5 L16 8 L10 12 L6 9Z" opacity=".7"/></svg> },
  { type: 'combo',           icon: (c) => <svg viewBox="0 0 18 18" fill={c}><rect x="2" y="10" width="3" height="7" rx=".5" opacity=".7"/><rect x="7.5" y="6" width="3" height="11" rx=".5" opacity=".7"/><rect x="13" y="8" width="3" height="9" rx=".5" opacity=".7"/><polyline points="2,9 7.5,5 13,7" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { type: 'pie',             icon: (c) => <svg viewBox="0 0 18 18" fill={c}><path d="M9 9 L9 2 A7 7 0 0 1 16 9Z"/><path d="M9 9 L16 9 A7 7 0 0 1 4.5 14.5Z" opacity=".65"/><path d="M9 9 L4.5 14.5 A7 7 0 0 1 9 2Z" opacity=".4"/></svg> },
  { type: 'donut',           icon: (c) => <svg viewBox="0 0 18 18" fill="none"><path d="M9 3 A6 6 0 0 1 15 9" stroke={c} strokeWidth="3.5" strokeLinecap="round"/><path d="M15 9 A6 6 0 0 1 4.5 13.5" stroke={c} strokeWidth="3.5" strokeLinecap="round" opacity=".65"/><path d="M4.5 13.5 A6 6 0 0 1 9 3" stroke={c} strokeWidth="3.5" strokeLinecap="round" opacity=".4"/></svg> },
  { type: 'treemap',         icon: (c) => <svg viewBox="0 0 18 18" fill={c}><rect x="1" y="1" width="8" height="10" rx=".5"/><rect x="10" y="1" width="7" height="4" rx=".5" opacity=".7"/><rect x="10" y="6" width="7" height="5" rx=".5" opacity=".5"/><rect x="1" y="12" width="16" height="5" rx=".5" opacity=".35"/></svg> },
  { type: 'waterfall',       icon: (c) => <svg viewBox="0 0 18 18" fill={c}><rect x="2" y="10" width="2.5" height="5" rx=".5"/><rect x="5.5" y="7" width="2.5" height="3" rx=".5" opacity=".8"/><rect x="9" y="4" width="2.5" height="3" rx=".5" opacity=".6"/><rect x="12.5" y="8" width="2.5" height="4" rx=".5" opacity=".4"/></svg> },
  { type: 'funnel',          icon: (c) => <svg viewBox="0 0 18 18" fill={c}><rect x="2" y="2" width="14" height="3" rx=".5"/><rect x="3.5" y="6" width="11" height="3" rx=".5" opacity=".75"/><rect x="5" y="10" width="8" height="3" rx=".5" opacity=".55"/><rect x="6.5" y="14" width="5" height="3" rx=".5" opacity=".35"/></svg> },
  { type: 'scatter',         icon: (c) => <svg viewBox="0 0 18 18" fill={c}><circle cx="4" cy="13" r="1.5"/><circle cx="8" cy="7" r="2" opacity=".8"/><circle cx="13" cy="10" r="1.5" opacity=".6"/><circle cx="15" cy="4" r="1.2" opacity=".9"/><circle cx="6" cy="3" r="1"/></svg> },
  { type: 'gauge',           icon: (c) => <svg viewBox="0 0 18 18" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><path d="M3 14 A7 7 0 0 1 15 14"/><path d="M9 14 L12 8" strokeWidth="1.5"/><circle cx="9" cy="14" r="1.5" fill={c}/></svg> },
  { type: 'kpi',             icon: (c) => <svg viewBox="0 0 18 18" fill={c}><text x="2" y="11" fontSize="6" fontWeight="bold" fontFamily="monospace" fill={c}>KPI</text><path d="M2 15 L6 11 L10 13 L16 7" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { type: 'table',           icon: (c) => <svg viewBox="0 0 18 18" fill="none" stroke={c} strokeWidth="1.5"><rect x="2" y="2" width="14" height="14" rx="1"/><line x1="2" y1="7" x2="16" y2="7"/><line x1="2" y1="12" x2="16" y2="12"/><line x1="7" y1="7" x2="7" y2="16"/></svg> },
  { type: 'matrix',          icon: (c) => <svg viewBox="0 0 18 18" fill="none" stroke={c} strokeWidth="1.5"><rect x="2" y="2" width="14" height="14" rx="1"/><line x1="2" y1="7" x2="16" y2="7"/><line x1="2" y1="11" x2="16" y2="11"/><line x1="7" y1="2" x2="7" y2="16"/><line x1="12" y1="7" x2="12" y2="16"/></svg> },
  { type: 'card',            icon: (c) => <svg viewBox="0 0 18 18" fill={c}><rect x="2" y="4" width="14" height="10" rx="1.5" opacity=".2"/><text x="5" y="12" fontSize="8" fontWeight="bold" fontFamily="monospace" fill={c}>42</text></svg> },
  { type: 'map',             icon: (c) => <svg viewBox="0 0 18 18" fill="none" stroke={c} strokeWidth="1.5"><ellipse cx="9" cy="9" rx="7" ry="7"/><path d="M2 9 Q5 6 9 9 Q13 12 16 9"/><line x1="9" y1="2" x2="9" y2="16"/></svg> },
  { type: 'wordCloud',       icon: (c) => <svg viewBox="0 0 18 18" fill={c}><text x="1" y="8" fontSize="6" fontFamily="sans-serif" fontWeight="bold">Hi</text><text x="7" y="11" fontSize="9" fontFamily="sans-serif">BI</text><text x="2" y="15" fontSize="4.5" fontFamily="sans-serif" opacity=".6">data</text></svg> },
  { type: 'qna',             icon: (c) => <svg viewBox="0 0 18 18" fill="none" stroke={c} strokeWidth="1.5"><circle cx="9" cy="8" r="5.5"/><path d="M7 7 Q7 5.5 9 5.5 Q11 5.5 11 7 Q11 8.5 9 9"/><circle cx="9" cy="11" r=".8" fill={c}/></svg> },
]

const ACCENT_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#84cc16']

// ─── Main RightPane ───────────────────────────────────────────────────────────

interface Props {
  selectedVisual: Visual | null
  dataSources: DataSource[]
  activeSourceId: string | null
  measures: Measure[]
  relationships: Relationship[]
  onAddVisual: (type: VisualType) => void
  onChangeType: (type: VisualType) => void
  onUpdateFormat: (fmt: Partial<VisualFormat>) => void
  onRemoveField: (bucketId: string, index: number) => void
  onSelectSource: (id: string) => void
  onAddSource: () => void
  onRemoveSource: (id: string) => void
  onOpenETL: (src: DataSource) => void
  onAddMeasure: (name: string, expression: string) => void
  onRemoveMeasure: (id: string) => void
  onAddRelationship: (rel: Omit<Relationship, 'id'>) => void
  onRemoveRelationship: (id: string) => void
}

export function RightPane({
  selectedVisual, dataSources, activeSourceId, measures, relationships,
  onAddVisual, onChangeType, onUpdateFormat, onRemoveField,
  onSelectSource, onAddSource, onRemoveSource, onOpenETL,
  onAddMeasure, onRemoveMeasure, onAddRelationship, onRemoveRelationship
}: Props): React.JSX.Element {
  const [tab, setTab]                   = useState<PaneTab>('build')
  const [showMeasureModal, setShowMeasureModal] = useState(false)
  const [showRelModal, setShowRelModal] = useState(false)
  const [dataExpanded, setDataExpanded] = useState(true)

  const activeSource  = useMemo(() => dataSources.find((s) => s.id === activeSourceId) ?? null, [dataSources, activeSourceId])
  const dimensions    = useMemo(() => activeSource?.fields.filter((f) => f.type === 'dimension') ?? [], [activeSource])
  const measureFields = useMemo(() => activeSource?.fields.filter((f) => f.type === 'measure') ?? [], [activeSource])

  const sourceName = useMemo(() => (id: string): string =>
    dataSources.find((s) => s.id === id)?.fileName ?? id, [dataSources])

  return (
    <>
      <div
        style={{
          width: 272, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#181818', borderLeft: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden'
        }}
      >
        {/* ── Visualizations grid ──────────────────────────────── */}
        <div style={{ flexShrink: 0, padding: '10px 8px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, paddingLeft: 4 }}>
            Visualizations
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2 }}>
            {VIS_ENTRIES.map(({ type, icon }) => {
              const meta     = VIS_META[type]
              const catColor = CAT_COLOR[meta.category] ?? '#888'
              const isActive = selectedVisual?.type === type
              const isImpl   = meta.implemented
              return (
                <button
                  key={type}
                  onClick={() => selectedVisual ? onChangeType(type) : onAddVisual(type)}
                  title={meta.label + (!isImpl ? ' (coming soon)' : '')}
                  style={{
                    width: 38, height: 38,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 7, border: 'none', cursor: isImpl ? 'pointer' : 'default',
                    background: isActive ? `${catColor}25` : 'transparent',
                    boxShadow: isActive ? `0 0 0 1.5px ${catColor}60` : 'none',
                    opacity: !isImpl ? 0.28 : 1,
                    transition: 'background 0.12s, box-shadow 0.12s'
                  }}
                  onMouseEnter={(e) => {
                    if (isImpl && !isActive)
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  }}
                >
                  <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon(isActive ? catColor : isImpl ? catColor + 'cc' : '#555')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Build / Format tabs ───────────────────────────────── */}
        <div style={{ flexShrink: 0, display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {(['build', 'format'] as PaneTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 500,
                border: 'none', background: 'transparent', cursor: 'pointer',
                borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
                color: tab === t ? '#3b82f6' : '#555',
                transition: 'color 0.12s'
              }}
            >
              {t === 'build' ? 'Build visual' : 'Format'}
            </button>
          ))}
        </div>

        {/* ── Build / Format content ────────────────────────────── */}
        <div style={{ flex: '0 0 auto', overflowY: 'auto', maxHeight: 260 }}>
          {!selectedVisual ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: 100, opacity: 0.2, gap: 6
            }}>
              <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/>
              </svg>
              <p style={{ fontSize: 11, color: 'white', textAlign: 'center' }}>
                Click a chart type above to add a visual
              </p>
            </div>
          ) : tab === 'build' ? (
            <BuildPane visual={selectedVisual} onRemoveField={onRemoveField} />
          ) : (
            <FormatPane format={selectedVisual.format} onUpdate={onUpdateFormat} />
          )}
        </div>

        {/* ── Data panel (sources + fields) ─────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Data panel header */}
          <div
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center',
              padding: '6px 12px', cursor: 'pointer',
              borderBottom: dataExpanded ? '1px solid rgba(255,255,255,0.05)' : 'none'
            }}
            onClick={() => setDataExpanded(!dataExpanded)}
          >
            <svg
              width="10" height="10" fill="none" stroke="#555" viewBox="0 0 24 24"
              style={{ marginRight: 6, transform: dataExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
            </svg>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1 }}>Data</span>
            <button
              onClick={(e) => { e.stopPropagation(); onAddSource() }}
              title="Open file"
              style={{
                width: 20, height: 20, borderRadius: 4, border: 'none',
                background: 'transparent', cursor: 'pointer', color: '#555',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#bbb'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
            </button>
          </div>

          {dataExpanded && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Source list */}
              {dataSources.length === 0 ? (
                <button
                  onClick={onAddSource}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', margin: '8px 0', padding: '8px 12px',
                    border: '1.5px dashed rgba(59,130,246,0.3)', borderRadius: 6,
                    background: 'rgba(59,130,246,0.05)', cursor: 'pointer',
                    color: '#3b82f6', fontSize: 11
                  }}
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                  </svg>
                  Open CSV / Parquet file
                </button>
              ) : (
                <div style={{ padding: '4px 8px' }}>
                  {dataSources.map((src) => (
                    <SourceRow
                      key={src.id}
                      source={src}
                      isActive={src.id === activeSourceId}
                      onSelect={() => onSelectSource(src.id)}
                      onRemove={() => onRemoveSource(src.id)}
                      onOpenETL={() => onOpenETL(src)}
                    />
                  ))}
                </div>
              )}

              {/* Fields for active source */}
              {activeSource && (
                <div style={{ padding: '4px 8px 8px' }}>
                  {dimensions.length > 0 && (
                    <FieldGroup label="Dimensions" fields={dimensions} tableName={activeSource.tableName} color="#60a5fa" />
                  )}
                  {measureFields.length > 0 && (
                    <FieldGroup label="Measures" fields={measureFields} tableName={activeSource.tableName} color="#a78bfa" />
                  )}
                </div>
              )}

              {/* Measures (calculated) */}
              {measures.length > 0 && (
                <div style={{ padding: '0 8px 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '4px 4px 2px', marginBottom: 2 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>Calculated Measures</span>
                    <button onClick={() => setShowMeasureModal(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#555', padding: 2 }} title="New measure"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#bbb' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#555' }}>
                      <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                      </svg>
                    </button>
                  </div>
                  {measures.map((m) => (
                    <MeasureFieldItem key={m.id} measure={m} onRemove={() => onRemoveMeasure(m.id)} />
                  ))}
                </div>
              )}
              {measures.length === 0 && dataSources.length > 0 && (
                <div style={{ padding: '0 12px 8px' }}>
                  <button onClick={() => setShowMeasureModal(true)} style={{
                    fontSize: 10, color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0'
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#888' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#555' }}>
                    + New calculated measure
                  </button>
                </div>
              )}

              {/* Relationships */}
              {dataSources.length >= 2 && (
                <div style={{ padding: '4px 8px 8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '4px 4px 4px', marginBottom: 2 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>Relationships</span>
                    <button onClick={() => setShowRelModal(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#555', padding: 2 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#bbb' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#555' }}>
                      <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                      </svg>
                    </button>
                  </div>
                  {relationships.length === 0 ? (
                    <p style={{ fontSize: 10, color: '#444', padding: '2px 4px' }}>No relationships defined</p>
                  ) : (
                    relationships.map((rel) => (
                      <div key={rel.id} style={{ fontSize: 10, color: '#666', padding: '3px 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#3b82f6', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sourceName(rel.fromTable)}</span>
                        <span>.{rel.fromColumn} = </span>
                        <span style={{ color: '#3b82f6' }}>{sourceName(rel.toTable)}</span>
                        <span>.{rel.toColumn}</span>
                        <button onClick={() => onRemoveRelationship(rel.id)} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#444', cursor: 'pointer', padding: 2 }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#444' }}>
                          <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showMeasureModal && (
        <MeasureModal dataSources={dataSources} onSave={onAddMeasure} onClose={() => setShowMeasureModal(false)} />
      )}
      {showRelModal && dataSources.length >= 2 && (
        <RelationshipModal dataSources={dataSources} onSave={onAddRelationship} onClose={() => setShowRelModal(false)} />
      )}
    </>
  )
}

// ─── Source row ───────────────────────────────────────────────────────────────

function SourceRow({ source, isActive, onSelect, onRemove, onOpenETL }: {
  source: DataSource; isActive: boolean
  onSelect: () => void; onRemove: () => void; onOpenETL: () => void
}): React.JSX.Element {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 6px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
        background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
        border: isActive ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
        transition: 'background 0.1s'
      }}
      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <svg width="12" height="12" fill="none" stroke={isActive ? '#60a5fa' : '#555'} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: isActive ? '#93c5fd' : '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {source.fileName}
        </p>
        <p style={{ fontSize: 9, color: '#555' }}>
          {source.rowCount.toLocaleString()} rows · {source.fields.length} cols
        </p>
      </div>
      {/* ETL button */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpenETL() }}
        title="Open in Power Query"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#444', padding: 3, borderRadius: 4, flexShrink: 0 }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#3b82f6'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.12)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#444'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
        </svg>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#333', padding: 3, borderRadius: 4, flexShrink: 0 }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#333'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}

// ─── Field group ──────────────────────────────────────────────────────────────

function FieldGroup({ label, fields, tableName, color }: {
  label: string; fields: { name: string; type: string; dataType: string }[]; tableName: string; color: string
}): React.JSX.Element {
  return (
    <div style={{ marginBottom: 6 }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 4px 2px' }}>{label}</p>
      {fields.map((field) => (
        <DraggableField key={field.name} field={field} tableName={tableName} color={color} />
      ))}
    </div>
  )
}

function DraggableField({ field, tableName, color }: {
  field: { name: string; type: string; dataType: string }; tableName: string; color: string
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${tableName}::${field.name}`,
    data: {
      fieldName: field.name,
      tableName,
      isMeasure: field.type === 'measure',
      dataType: field.dataType
    } as AxisField
  })
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 6px', borderRadius: 5, cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        transform: CSS.Translate.toString(transform),
        background: 'transparent', transition: 'background 0.1s'
      }}
      {...listeners}
      {...attributes}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <span style={{
        width: 14, height: 14, borderRadius: 3, flexShrink: 0, fontSize: 8, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${color}20`, color
      }}>
        {field.type === 'measure' ? 'M' : 'D'}
      </span>
      <span style={{ fontSize: 11, color: '#bbb', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {field.name}
      </span>
      <span style={{ fontSize: 9, color: '#3a3a3a', fontFamily: 'monospace' }}>{field.dataType}</span>
    </div>
  )
}

function MeasureFieldItem({ measure, onRemove }: { measure: Measure; onRemove: () => void }): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `measure::${measure.id}`,
    data: {
      fieldName: measure.name,
      tableName: '',
      isMeasure: true,
      measureExpression: measure.expression
    } as AxisField
  })
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 6px', borderRadius: 5, cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        transform: CSS.Translate.toString(transform)
      }}
      {...listeners}
      {...attributes}
    >
      <span style={{
        width: 14, height: 14, borderRadius: 3, flexShrink: 0, fontSize: 8, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(139,92,246,0.2)', color: '#a78bfa'
      }}>fx</span>
      <span style={{ fontSize: 11, color: '#bbb', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{measure.name}</span>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#3a3a3a', padding: 2 }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#3a3a3a' }}
      >
        <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}

// ─── Build Pane ───────────────────────────────────────────────────────────────

function BuildPane({ visual, onRemoveField }: { visual: Visual; onRemoveField: (b: string, i: number) => void }): React.JSX.Element {
  const buckets = VIS_META[visual.type].buckets
  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {buckets.map((bucket) => (
        <FieldBucket
          key={bucket.id}
          visualId={visual.id}
          bucket={bucket}
          fields={visual.fields[bucket.id] ?? []}
          onRemove={(i) => onRemoveField(bucket.id, i)}
        />
      ))}
    </div>
  )
}

function FieldBucket({ visualId, bucket, fields, onRemove }: {
  visualId: string
  bucket: import('../../types/visual').BucketDef
  fields: AxisField[]
  onRemove: (index: number) => void
}): React.JSX.Element {
  const droppableId = `bucket__${visualId}__${bucket.id}`
  const { isOver, setNodeRef } = useDroppable({ id: droppableId })

  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        {bucket.label}
        {bucket.required && <span style={{ color: '#3b82f6' }}>*</span>}
      </p>
      <div
        ref={setNodeRef}
        style={{
          minHeight: 32, borderRadius: 6,
          border: isOver
            ? '1.5px solid rgba(59,130,246,0.7)'
            : fields.length === 0 ? '1.5px dashed rgba(255,255,255,0.1)' : '1.5px solid rgba(255,255,255,0.08)',
          background: isOver ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
          transition: 'border-color 0.12s, background 0.12s'
        }}
      >
        {fields.length === 0 ? (
          <p style={{ padding: '6px 10px', fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>{bucket.hint}</p>
        ) : (
          <div style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {fields.map((f, i) => (
              <div
                key={i}
                className="group"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.06)'
                }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0, fontSize: 8, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: f.isMeasure ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)',
                  color: f.isMeasure ? '#a78bfa' : '#60a5fa'
                }}>
                  {f.isMeasure ? 'M' : 'D'}
                </span>
                <span style={{ flex: 1, fontSize: 11, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.fieldName}
                </span>
                <button
                  onClick={() => onRemove(i)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 2, flexShrink: 0 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)' }}
                >
                  <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}
            {bucket.multi && (
              <div style={{ padding: '3px 8px', fontSize: 10, color: 'rgba(255,255,255,0.15)', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 4 }}>
                + drag another field here
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Format Pane ──────────────────────────────────────────────────────────────

function FormatPane({ format, onUpdate }: { format: VisualFormat; onUpdate: (f: Partial<VisualFormat>) => void }): React.JSX.Element {
  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title</p>
          <Toggle value={format.showTitle} onChange={(v) => onUpdate({ showTitle: v })} />
        </div>
        {format.showTitle && (
          <input
            value={format.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            style={{
              width: '100%', padding: '6px 8px', borderRadius: 6, boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              fontSize: 12, color: '#ccc', outline: 'none'
            }}
          />
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Data Labels</p>
        <Toggle value={format.showDataLabels} onChange={(v) => onUpdate({ showDataLabels: v })} />
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Primary Color</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ACCENT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onUpdate({ color: c })}
              style={{
                width: 22, height: 22, borderRadius: '50%', border: 'none', background: c, cursor: 'pointer',
                boxShadow: format.color === c ? `0 0 0 2px #181818, 0 0 0 3.5px ${c}` : 'none',
                transition: 'transform 0.1s, box-shadow 0.1s'
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }): React.JSX.Element {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 32, height: 18, borderRadius: 9, border: 'none', flexShrink: 0,
        background: value ? '#3b82f6' : 'rgba(255,255,255,0.12)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.15s'
      }}
    >
      <span style={{
        position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%', background: 'white',
        transform: value ? 'translateX(16px)' : 'translateX(2px)',
        transition: 'transform 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
      }} />
    </button>
  )
}
