import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis,
  FunnelChart, Funnel, LabelList
} from 'recharts'
import { isQueryable, VIS_META } from '../../types/visual'
import type { Visual, VisualType } from '../../types/visual'
import type { AxisField } from '../../App'

interface Props {
  visual: Visual
  isSelected: boolean
  onSelect: () => void
  onMove: (x: number, y: number) => void
  onResize: (width: number, height: number) => void
  onDelete: () => void
}

type VisualData =
  | { kind: 'chart'; rows: { x: unknown; value: number }[] }
  | { kind: 'table'; columns: string[]; rows: unknown[][] }
  | { kind: 'card'; value: number; label: string }

// Accessible color palette — works on dark backgrounds, not eye-straining
const PALETTE = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#84cc16'
]

const TOOLTIP_STYLE = {
  background: '#1e1e1e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  fontSize: 11,
  color: '#e4e4e4',
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
}

const AXIS_TICK = { fontSize: 10, fill: '#666' }

function getQueryKind(type: VisualType): 'chart' | 'table' | 'card' {
  if (['table', 'matrix'].includes(type)) return 'table'
  if (['card', 'kpi', 'gauge'].includes(type)) return 'card'
  return 'chart'
}

function extractChartFields(visual: Visual): { xField: AxisField; yField: AxisField } | null {
  const t = visual.type
  let xBucket = 'x'
  let yBucket = 'y'
  if (['pie', 'donut'].includes(t)) { xBucket = 'legend'; yBucket = 'values' }
  if (['funnel', 'treemap'].includes(t)) { xBucket = 'category'; yBucket = 'values' }
  const xArr = visual.fields[xBucket] ?? []
  const yArr = visual.fields[yBucket] ?? []
  if (xArr.length === 0 || yArr.length === 0) return null
  return { xField: xArr[0], yField: yArr[0] }
}

async function executeVisualQuery(visual: Visual): Promise<VisualData> {
  const kind = getQueryKind(visual.type)

  if (kind === 'chart') {
    const fields = extractChartFields(visual)
    if (!fields) throw new Error('Required fields missing')
    const result = await window.api.queryChart(fields.xField, fields.yField)
    if (!result.success) throw new Error(result.error)
    return { kind: 'chart', rows: result.data }
  }

  if (kind === 'table') {
    const cols = visual.fields['columns'] ?? []
    if (cols.length === 0) throw new Error('No columns selected')
    const tableName = cols[0].tableName
    const columnNames = cols.map((f) => f.fieldName)
    const result = await window.api.queryColumns(tableName, columnNames, 500)
    if (!result.success) throw new Error(result.error)
    return { kind: 'table', columns: columnNames, rows: result.rows }
  }

  // card
  const fields = visual.fields['fields'] ?? []
  if (fields.length === 0) throw new Error('No field selected')
  const f = fields[0]
  const result = await window.api.queryAggregate(f.tableName, f.fieldName, f.isMeasure, f.measureExpression)
  if (!result.success) throw new Error(result.error)
  return { kind: 'card', value: result.value, label: f.fieldName }
}

// ─── Chart Renderers ──────────────────────────────────────────────────────────

function ChartContent({ visual, data }: { visual: Visual; data: VisualData }): React.JSX.Element | null {
  const { type, format } = visual
  const color = format.color
  const showLabels = format.showDataLabels

  if (data.kind === 'card') {
    const v = data.value
    const display = typeof v === 'number'
      ? Math.abs(v) >= 1_000_000
        ? (v / 1_000_000).toFixed(1) + 'M'
        : Math.abs(v) >= 1_000
          ? (v / 1_000).toFixed(1) + 'K'
          : v % 1 === 0 ? v.toLocaleString() : v.toFixed(2)
      : String(v)
    return (
      <div className="flex flex-col items-center justify-center h-full gap-1">
        <span className="text-[40px] font-semibold tabular-nums leading-none" style={{ color }}>
          {display}
        </span>
        <span className="text-[11px] text-[#666] mt-1 truncate max-w-[90%]">{data.label}</span>
      </div>
    )
  }

  if (data.kind === 'table') {
    return (
      <div className="h-full overflow-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead className="sticky top-0" style={{ background: '#1a1a1a' }}>
            <tr>
              {data.columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-1.5 text-left font-semibold text-[#888] border-b whitespace-nowrap"
                  style={{ borderColor: 'rgba(255,255,255,0.07)' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, ri) => (
              <tr
                key={ri}
                className="transition-colors"
                style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="px-3 py-1 text-[#ccc] border-b whitespace-nowrap"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                  >
                    {cell == null ? <span className="italic text-[#444]">null</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const chartData = data.rows.map((r) => ({ x: String(r.x ?? ''), value: r.value }))
  const common = { data: chartData, margin: { top: 10, right: 16, left: -10, bottom: 4 } }

  if (type === 'clusteredBar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...common} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="x" tick={AXIS_TICK} axisLine={false} tickLine={false} width={90} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="value" fill={color} radius={[0, 3, 3, 0]} maxBarSize={28}>
            {showLabels && <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: '#666' }} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (['clusteredColumn', 'stackedColumn', 'column100'].includes(type)) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="x" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={36}>
            {showLabels && <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: '#666' }} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="x" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Line
            type="monotone" dataKey="value" stroke={color} strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }}
          >
            {showLabels && <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: '#666' }} />}
          </Line>
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'area') {
    const gradId = `ag_${visual.id}`
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart {...common}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="x" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'scatter') {
    const scatterData = data.rows.map((r) => ({ x: Number(r.x) || 0, y: r.value }))
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 16, left: -10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis type="number" dataKey="x" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis type="number" dataKey="y" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <ZAxis range={[28, 28]} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
          <Scatter data={scatterData} fill={color} opacity={0.8} />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'pie' || type === 'donut') {
    const inner = type === 'donut' ? '52%' : 0
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="x"
            cx="50%" cy="50%"
            innerRadius={inner}
            outerRadius="68%"
            paddingAngle={type === 'donut' ? 3 : 1}
            label={showLabels ? ({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : false}
            labelLine={showLabels}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'funnel') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Funnel dataKey="value" data={chartData} isAnimationActive>
            {chartData.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
            {showLabels && <LabelList position="right" fill="#666" fontSize={10} dataKey="x" />}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    )
  }

  // Fallback: column chart
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart {...common}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="x" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── VisualWidget ─────────────────────────────────────────────────────────────

const MIN_W = 240
const MIN_H = 180

export function VisualWidget({ visual, isSelected, onSelect, onMove, onResize, onDelete }: Props): React.JSX.Element {
  const [data, setData] = useState<VisualData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stable key — only recomputes when fields reference changes (not on every render)
  const fieldsKey = useMemo(() => JSON.stringify(visual.fields), [visual.fields])

  // Re-query whenever fields or type change
  useEffect(() => {
    if (!isQueryable(visual)) {
      setData(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    executeVisualQuery(visual)
      .then((result) => { if (!cancelled) { setData(result); setLoading(false) } })
      .catch((err: Error) => { if (!cancelled) { setError(err.message ?? String(err)); setLoading(false) } })
    return () => { cancelled = true }
  }, [fieldsKey, visual.type]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag to move ──────────────────────────────────────────────────────────
  const dragRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.stopPropagation()
    onSelect()
    dragRef.current = { mx: e.clientX, my: e.clientY, px: visual.position.x, py: visual.position.y }
    const onMove_ = (ev: MouseEvent): void => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.mx
      const dy = ev.clientY - dragRef.current.my
      onMove(Math.max(0, dragRef.current.px + dx), Math.max(0, dragRef.current.py + dy))
    }
    const onUp = (): void => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove_)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove_)
    window.addEventListener('mouseup', onUp)
  }, [visual.position, onSelect, onMove])

  // ── Resize ────────────────────────────────────────────────────────────────
  const resizeRef = useRef<{ mx: number; my: number; w: number; h: number } | null>(null)

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    resizeRef.current = { mx: e.clientX, my: e.clientY, w: visual.size.width, h: visual.size.height }
    const onMove_ = (ev: MouseEvent): void => {
      if (!resizeRef.current) return
      onResize(
        Math.max(MIN_W, resizeRef.current.w + ev.clientX - resizeRef.current.mx),
        Math.max(MIN_H, resizeRef.current.h + ev.clientY - resizeRef.current.my)
      )
    }
    const onUp = (): void => {
      resizeRef.current = null
      window.removeEventListener('mousemove', onMove_)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove_)
    window.addEventListener('mouseup', onUp)
  }, [visual.size, onResize])

  const { position, size, format } = visual
  const buckets = VIS_META[visual.type].buckets
  const requiredEmpty = buckets.filter((b) => b.required && (visual.fields[b.id] ?? []).length === 0)

  const borderColor = isSelected ? 'rgba(59,130,246,0.7)' : 'rgba(255,255,255,0.07)'
  const shadow = isSelected
    ? '0 0 0 1.5px rgba(59,130,246,0.6), 0 8px 32px rgba(0,0,0,0.6)'
    : '0 2px 16px rgba(0,0,0,0.45)'

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        background: '#1c1c1c',
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        boxShadow: shadow,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s, border-color 0.15s'
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleHeaderMouseDown}
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px',
          height: 34,
          background: '#212121',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          cursor: 'grab',
          userSelect: 'none'
        }}
      >
        {/* Visual type icon dot */}
        <span
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: format.color, opacity: 0.85, flexShrink: 0
          }}
        />

        {format.showTitle && (
          <span style={{
            flex: 1, fontSize: 12, fontWeight: 500,
            color: '#c8c8c8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {format.title}
          </span>
        )}
        {!format.showTitle && <span style={{ flex: 1 }} />}

        {/* Action buttons — only visible when selected */}
        {isSelected && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: 4, border: 'none',
              background: 'transparent', cursor: 'pointer', color: '#666',
              flexShrink: 0
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#666'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            title="Delete visual"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', padding: '6px 4px 4px' }}>
        {/* Loading */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(28,28,28,0.7)', zIndex: 2
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: '2px solid rgba(59,130,246,0.2)',
              borderTop: '2px solid #3b82f6',
              animation: 'spin 0.8s linear infinite'
            }} />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 8, padding: 16
          }}>
            <svg width="20" height="20" fill="none" stroke="#ef4444" viewBox="0 0 24 24" opacity={0.6}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <p style={{ fontSize: 11, color: '#ef4444', textAlign: 'center', opacity: 0.7, lineHeight: 1.5 }}>
              {error}
            </p>
          </div>
        )}

        {/* Empty state — prompt to add required fields */}
        {!loading && !error && !data && requiredEmpty.length > 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 6
          }}>
            <svg width="24" height="24" fill="none" stroke="rgba(255,255,255,0.15)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 4v16m8-8H4"/>
            </svg>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
              Add {requiredEmpty.map((b) => b.label).join(' & ')}
            </p>
          </div>
        )}

        {/* Chart */}
        {!loading && !error && data && (
          <ChartContent visual={visual} data={data} />
        )}
      </div>

      {/* Resize handle */}
      {isSelected && (
        <div
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 18, height: 18, cursor: 'se-resize', zIndex: 10,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
            padding: '3px 3px'
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="rgba(255,255,255,0.25)">
            <path d="M9 1L1 9M9 5L5 9M9 9"/>
            <line x1="9" y1="1" x2="1" y2="9" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="5" x2="5" y2="9" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </div>
  )
}
