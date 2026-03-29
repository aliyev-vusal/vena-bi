import React, { useEffect, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'table'

interface CanvasProps {
  activeChart: ChartType
  xField: string | null
  yField: string | null
  onClearField: (role: 'x' | 'y') => void
}

interface ChartRow {
  x: unknown
  value: number
}

const COLORS = [
  '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16'
]

const tickStyle = { fill: '#8b8b8f', fontSize: 11 }
const gridStyle = { stroke: 'rgba(255,255,255,0.06)', strokeDasharray: '3 3' }
const tooltipStyle = {
  background: '#2c2c2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  fontSize: 12,
  color: '#f2f2f7'
}

function formatTick(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(v)
}

export function Canvas({ activeChart, xField, yField, onClearField }: CanvasProps): React.JSX.Element {
  const [chartData, setChartData] = useState<ChartRow[]>([])
  const [isQuerying, setIsQuerying] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)

  useEffect(() => {
    if (!xField || !yField) {
      setChartData([])
      setQueryError(null)
      return
    }

    let cancelled = false
    setIsQuerying(true)
    setQueryError(null)

    window.api.queryChart(xField, yField).then((result) => {
      if (cancelled) return
      setIsQuerying(false)
      if (result.success) {
        setChartData(result.data)
      } else {
        setQueryError(result.error)
      }
    })

    return () => { cancelled = true }
  }, [xField, yField])

  return (
    <main className="flex-1 flex flex-col bg-macos-bg overflow-hidden p-4 gap-3">
      <div className="flex gap-3 shrink-0">
        <DropZone id="x-axis" label="X Axis" value={xField ?? undefined} onClear={() => onClearField('x')} />
        <DropZone id="y-axis" label="Y Axis" value={yField ?? undefined} onClear={() => onClearField('y')} />
      </div>

      <div className="flex-1 rounded-macos bg-macos-surface border border-macos-border overflow-hidden">
        {queryError ? (
          <ErrorState message={queryError} />
        ) : isQuerying ? (
          <LoadingState />
        ) : xField && yField && chartData.length > 0 ? (
          <ChartView activeChart={activeChart} data={chartData} xField={xField} yField={yField} />
        ) : (
          <EmptyState hasFields={!!(xField && yField)} />
        )}
      </div>
    </main>
  )
}

function DropZone({ id, label, value, onClear }: {
  id: string; label: string; value?: string; onClear: () => void
}): React.JSX.Element {
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 h-9 rounded-macos-sm border-2 border-dashed flex items-center px-3 gap-2 text-xs transition-all ${
        isOver
          ? 'border-macos-accent bg-blue-500/10 text-macos-accent'
          : value
            ? 'border-macos-border bg-macos-surface text-macos-text'
            : 'border-macos-border text-macos-text-secondary hover:border-macos-accent/50'
      }`}
    >
      <span className="text-macos-text-secondary font-medium shrink-0">{label}</span>
      <span className="w-px h-4 bg-macos-border shrink-0" />
      {value ? (
        <span className="flex-1 flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-macos-accent shrink-0" />
          <span className="truncate">{value}</span>
          <button onClick={onClear} className="ml-auto shrink-0 text-macos-text-secondary hover:text-macos-text transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ) : (
        <span className="flex-1 opacity-50">{isOver ? 'Drop here' : 'Drag a field…'}</span>
      )}
    </div>
  )
}

function ChartView({ activeChart, data, xField, yField }: {
  activeChart: ChartType; data: ChartRow[]; xField: string; yField: string
}): React.JSX.Element {
  const formatted = data.map((d) => ({ x: String(d.x), value: d.value }))

  return (
    <div className="w-full h-full flex flex-col p-4">
      <p className="text-xs text-macos-text-secondary mb-3 shrink-0">
        <strong className="text-macos-text font-medium">{xField}</strong>
        <span className="mx-1.5 opacity-40">×</span>
        <strong className="text-macos-text font-medium">SUM({yField})</strong>
        <span className="ml-2 opacity-40">— {data.length} groups</span>
      </p>
      <div className="flex-1 min-h-0">
        {activeChart === 'bar' && <BarView data={formatted} yField={yField} />}
        {activeChart === 'line' && <LineView data={formatted} yField={yField} />}
        {activeChart === 'pie' && <PieView data={formatted} />}
        {activeChart === 'scatter' && <ScatterView data={data} xField={xField} yField={yField} />}
        {activeChart === 'table' && <TableView data={formatted} xField={xField} yField={yField} />}
      </div>
    </div>
  )
}

function BarView({ data, yField }: { data: { x: string; value: number }[]; yField: string }): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 16, bottom: 32, left: 16 }}>
        <CartesianGrid {...gridStyle} />
        <XAxis dataKey="x" tick={tickStyle} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          interval="preserveStartEnd" angle={data.length > 12 ? -35 : 0} textAnchor={data.length > 12 ? 'end' : 'middle'} />
        <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={56} tickFormatter={formatTick} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          formatter={(v: number) => [v.toLocaleString(), `SUM(${yField})`]} />
        <Bar dataKey="value" fill="#0ea5e9" radius={[3, 3, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function LineView({ data, yField }: { data: { x: string; value: number }[]; yField: string }): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 32, left: 16 }}>
        <CartesianGrid {...gridStyle} />
        <XAxis dataKey="x" tick={tickStyle} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          interval="preserveStartEnd" angle={data.length > 12 ? -35 : 0} textAnchor={data.length > 12 ? 'end' : 'middle'} />
        <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={56} tickFormatter={formatTick} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString(), `SUM(${yField})`]} />
        <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function PieView({ data }: { data: { x: string; value: number }[] }): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="x" cx="50%" cy="50%" outerRadius="70%"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
          labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString()]} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#8b8b8f' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function ScatterView({ data, xField, yField }: { data: ChartRow[]; xField: string; yField: string }): React.JSX.Element {
  // Map to index (order) vs value for scatter when X is non-numeric
  const scatterData = data.map((d, i) => ({
    idx: i + 1,
    value: d.value,
    label: String(d.x)
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 4, right: 16, bottom: 32, left: 16 }}>
        <CartesianGrid {...gridStyle} />
        <XAxis type="number" dataKey="idx" name={xField} tick={tickStyle} tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} label={{ value: xField, position: 'insideBottom', offset: -16, fill: '#8b8b8f', fontSize: 11 }} />
        <YAxis type="number" dataKey="value" name={`SUM(${yField})`} tick={tickStyle} tickLine={false} axisLine={false} width={56} tickFormatter={formatTick} />
        <ZAxis range={[40, 40]} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.15)' }}
          content={({ payload }) => {
            if (!payload?.length) return null
            const d = scatterData[payload[0].payload.idx - 1]
            return (
              <div style={tooltipStyle} className="px-3 py-2">
                <p className="font-medium">{d?.label}</p>
                <p className="opacity-70">{`SUM(${yField}): ${d?.value.toLocaleString()}`}</p>
              </div>
            )
          }}
        />
        <Scatter data={scatterData} fill="#0ea5e9" fillOpacity={0.8} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

function TableView({ data, xField, yField }: { data: { x: string; value: number }[]; xField: string; yField: string }): React.JSX.Element {
  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0">
          <tr className="bg-macos-border">
            <th className="text-left px-4 py-2.5 font-semibold text-macos-text-secondary border-b border-macos-border">{xField}</th>
            <th className="text-right px-4 py-2.5 font-semibold text-macos-text-secondary border-b border-macos-border">SUM({yField})</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-macos-border/50 hover:bg-macos-border/40 transition-colors">
              <td className="px-4 py-2 text-macos-text">{row.x}</td>
              <td className="px-4 py-2 text-right text-macos-text font-mono">{row.value.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ hasFields }: { hasFields: boolean }): React.JSX.Element {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-macos-text-secondary">
      <div className="w-16 h-16 rounded-macos-lg bg-macos-border flex items-center justify-center opacity-40">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-sm font-medium">{hasFields ? 'No data returned' : 'Drop fields to build a chart'}</p>
      <p className="text-xs opacity-50">{hasFields ? 'The query returned no rows' : 'Drag a dimension to X Axis and a measure to Y Axis'}</p>
    </div>
  )
}

function LoadingState(): React.JSX.Element {
  return (
    <div className="w-full h-full flex items-center justify-center gap-2 text-macos-text-secondary text-sm">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
      </svg>
      Querying…
    </div>
  )
}

function ErrorState({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-8">
      <p className="text-red-400 text-sm font-medium">Query failed</p>
      <p className="text-red-400/70 text-xs text-center">{message}</p>
    </div>
  )
}
