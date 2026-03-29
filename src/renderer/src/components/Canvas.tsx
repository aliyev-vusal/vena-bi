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
    // TODO: read field name from drag data in Step 3
    const fieldName = e.dataTransfer.getData('text/plain') || 'Alan'
    setDroppedFields((prev) => {
      const filtered = prev.filter((f) => f.role !== role)
      return [...filtered, { name: fieldName, role }]
    })
  }

  const xField = droppedFields.find((f) => f.role === 'x')
  const yField = droppedFields.find((f) => f.role === 'y')
  const hasData = xField && yField

  return (
    <main className="flex-1 flex flex-col bg-macos-bg overflow-hidden">
      {/* Drop zones */}
      <div className="flex gap-3 p-4 shrink-0">
        <DropZone
          label="X Ekseni"
          value={xField?.name}
          role="x"
          isDragOver={isDragOver === 'x'}
          onDragOver={(e) => handleDragOver(e, 'x')}
          onDragLeave={() => setIsDragOver(null)}
          onDrop={(e) => handleDrop(e, 'x')}
        />
        <DropZone
          label="Y Ekseni (Ölçüm)"
          value={yField?.name}
          role="y"
          isDragOver={isDragOver === 'y'}
          onDragOver={(e) => handleDragOver(e, 'y')}
          onDragLeave={() => setIsDragOver(null)}
          onDrop={(e) => handleDrop(e, 'y')}
        />
      </div>

      {/* Chart area */}
      <div className="flex-1 mx-4 mb-4 rounded-macos bg-macos-surface border border-macos-border flex items-center justify-center overflow-hidden">
        {hasData ? (
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
  onDrop
}: {
  label: string
  value?: string
  role: 'x' | 'y'
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}): React.JSX.Element {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex-1 h-10 rounded-macos-sm border-2 border-dashed flex items-center justify-center text-sm transition-all ${
        isDragOver
          ? 'border-macos-accent bg-blue-500 bg-opacity-10 text-macos-accent'
          : value
            ? 'border-macos-border bg-macos-surface text-macos-text'
            : 'border-macos-border text-macos-text-secondary'
      }`}
    >
      {value ? (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-macos-accent" />
          {value}
        </span>
      ) : (
        <span>{label} için sürükleyin</span>
      )}
    </div>
  )
}

function EmptyState(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 text-macos-text-secondary">
      <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <p className="text-sm">Sol panelden alanları sürükleyin</p>
      <p className="text-xs opacity-60">X ve Y eksenlerini doldurunca grafik oluşacak</p>
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
  // Mock bar chart visualization as placeholder (will be replaced with real chart in Step 3)
  const mockBars = [65, 80, 45, 90, 55, 70, 85, 40, 95, 60]

  return (
    <div className="w-full h-full flex flex-col p-6">
      <p className="text-xs text-macos-text-secondary mb-4">
        {chartType.toUpperCase()} — X: <strong className="text-macos-text">{xField}</strong> / Y:{' '}
        <strong className="text-macos-text">{yField}</strong>
      </p>

      {/* Simple SVG mock chart */}
      <div className="flex-1 flex items-end gap-2 px-4 pb-8">
        {mockBars.map((height, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-macos-accent opacity-80 hover:opacity-100 transition-all"
            style={{ height: `${height}%` }}
            title={`${yField}: ${Math.round(height * 10)}`}
          />
        ))}
      </div>

      <p className="text-center text-xs text-macos-text-secondary">
        Adım 3'te gerçek grafik entegre edilecek (Recharts / ECharts)
      </p>
    </div>
  )
}
