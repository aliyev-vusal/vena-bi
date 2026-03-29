import React, { useState } from 'react'

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'table'

interface CanvasProps {
  activeChart: ChartType
}

interface DroppedField {
  name: string
  role: 'x' | 'y'
}

export function Canvas({ activeChart }: CanvasProps): React.JSX.Element {
  const [droppedFields, setDroppedFields] = useState<DroppedField[]>([])
  const [isDragOver, setIsDragOver] = useState<'x' | 'y' | null>(null)

  const handleDragOver = (e: React.DragEvent, role: 'x' | 'y'): void => {
    e.preventDefault()
    setIsDragOver(role)
  }

  const handleDrop = (e: React.DragEvent, role: 'x' | 'y'): void => {
    e.preventDefault()
    setIsDragOver(null)
    const fieldName = e.dataTransfer.getData('text/plain')
    if (!fieldName) return
    setDroppedFields((prev) => [...prev.filter((f) => f.role !== role), { name: fieldName, role }])
  }

  const xField = droppedFields.find((f) => f.role === 'x')
  const yField = droppedFields.find((f) => f.role === 'y')

  const clearField = (role: 'x' | 'y'): void => {
    setDroppedFields((prev) => prev.filter((f) => f.role !== role))
  }

  return (
    <main className="flex-1 flex flex-col bg-macos-bg overflow-hidden p-4 gap-3">
      {/* Axis drop zone row */}
      <div className="flex gap-3 shrink-0">
        <DropZone
          label="X Axis"
          value={xField?.name}
          role="x"
          isDragOver={isDragOver === 'x'}
          onDragOver={(e) => handleDragOver(e, 'x')}
          onDragLeave={() => setIsDragOver(null)}
          onDrop={(e) => handleDrop(e, 'x')}
          onClear={() => clearField('x')}
        />
        <DropZone
          label="Y Axis"
          value={yField?.name}
          role="y"
          isDragOver={isDragOver === 'y'}
          onDragOver={(e) => handleDragOver(e, 'y')}
          onDragLeave={() => setIsDragOver(null)}
          onDrop={(e) => handleDrop(e, 'y')}
          onClear={() => clearField('y')}
        />
      </div>

      {/* Chart area */}
      <div className="flex-1 rounded-macos bg-macos-surface border border-macos-border overflow-hidden">
        {xField && yField ? (
          <ChartPlaceholder chartType={activeChart} xField={xField.name} yField={yField.name} />
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  )
}

function DropZone({
  label,
  value,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onClear
}: {
  label: string
  value?: string
  role: 'x' | 'y'
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onClear: () => void
}): React.JSX.Element {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex-1 h-9 rounded-macos-sm border-2 border-dashed flex items-center px-3 gap-2 text-xs transition-all ${
        isDragOver
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
          <button
            onClick={onClear}
            className="ml-auto shrink-0 text-macos-text-secondary hover:text-macos-text transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ) : (
        <span className="flex-1 opacity-50">
          {isDragOver ? `Drop here` : `Drag a field…`}
        </span>
      )}
    </div>
  )
}

function EmptyState(): React.JSX.Element {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-macos-text-secondary">
      <div className="w-16 h-16 rounded-macos-lg bg-macos-border flex items-center justify-center opacity-40">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-sm font-medium">Drop fields to build a chart</p>
      <p className="text-xs opacity-50">Drag a dimension to X Axis and a measure to Y Axis</p>
    </div>
  )
}

function ChartPlaceholder({
  chartType,
  xField,
  yField
}: {
  chartType: ChartType
  xField: string
  yField: string
}): React.JSX.Element {
  const mockBars = [65, 80, 45, 90, 55, 70, 85, 40, 95, 60]

  return (
    <div className="w-full h-full flex flex-col p-6">
      {/* Chart header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="px-2 py-0.5 rounded bg-macos-accent/20 text-macos-accent text-[10px] font-semibold uppercase tracking-wider">
          {chartType}
        </span>
        <span className="text-xs text-macos-text-secondary">
          <strong className="text-macos-text font-medium">{xField}</strong>
          <span className="mx-1.5 opacity-40">×</span>
          <strong className="text-macos-text font-medium">{yField}</strong>
        </span>
      </div>

      {/* Mock bar chart */}
      <div className="flex-1 flex items-end gap-1.5 px-2 pb-6">
        {mockBars.map((height, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-[3px] bg-macos-accent opacity-75 hover:opacity-100 transition-opacity"
              style={{ height: `${height}%` }}
              title={`${yField}: ${Math.round(height * 10)}`}
            />
          </div>
        ))}
      </div>

      <p className="text-center text-[10px] text-macos-text-secondary opacity-40">
        Chart preview — real rendering in Step 3 (Recharts / ECharts)
      </p>
    </div>
  )
}
