import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface Field {
  name: string
  type: 'dimension' | 'measure'
  dataType: string
}

interface DataSource {
  filePath: string
  rowCount: number
}

interface SidebarProps {
  width: number
  fields: Field[]
  dataSource: DataSource | null
  onClearDataSource: () => void
}

export function Sidebar({ width, fields, dataSource, onClearDataSource }: SidebarProps): React.JSX.Element {
  const dimensions = fields.filter((f) => f.type === 'dimension')
  const measures = fields.filter((f) => f.type === 'measure')
  const fileName = dataSource
    ? dataSource.filePath.split('/').pop() ?? dataSource.filePath
    : null

  return (
    <aside
      style={{ width }}
      className="shrink-0 bg-macos-sidebar flex flex-col select-none overflow-hidden"
    >
      {/* Traffic light spacer */}
      <div className="h-10 drag-region" />

      {/* Data source info */}
      <div className="px-3 pb-3 border-b border-macos-border">
        <p className="text-[10px] font-semibold text-macos-text-secondary uppercase tracking-widest mb-2 px-1">
          Data Source
        </p>

        {dataSource ? (
          <div className="px-3 py-2 rounded-macos-sm bg-macos-border flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-macos-text truncate" title={dataSource.filePath}>
                {fileName}
              </p>
              <p className="text-[10px] text-macos-text-secondary mt-0.5">
                {dataSource.rowCount.toLocaleString()} rows · {fields.length} columns
              </p>
            </div>
            <button
              onClick={onClearDataSource}
              title="Remove data source"
              className="shrink-0 mt-0.5 text-macos-text-secondary hover:text-red-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ) : (
          <p className="px-1 text-[11px] text-macos-text-secondary opacity-60">
            No file loaded. Use <span className="font-medium text-macos-text">Open File</span> or{' '}
            <span className="font-mono text-[10px] bg-macos-border px-1 py-0.5 rounded">⌘O</span>
          </p>
        )}
      </div>

      {/* Fields list */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {fields.length === 0 ? (
          <EmptyFields />
        ) : (
          <>
            <FieldGroup label="Dimensions" fields={dimensions} />
            <FieldGroup label="Measures" fields={measures} />
          </>
        )}
      </div>
    </aside>
  )
}

function EmptyFields(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-macos-text-secondary opacity-40">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 10h18M3 14h18M10 3v18M14 3v18" />
      </svg>
      <p className="text-[11px] text-center leading-relaxed">
        Open a CSV or<br />Parquet file to start
      </p>
    </div>
  )
}

function FieldGroup({ label, fields }: { label: string; fields: Field[] }): React.JSX.Element {
  if (fields.length === 0) return <></>
  return (
    <div>
      <p className="px-2 mb-1 text-[10px] font-semibold text-macos-text-secondary uppercase tracking-widest">
        {label}
      </p>
      {fields.map((field) => (
        <FieldItem key={field.name} field={field} />
      ))}
    </div>
  )
}

function FieldItem({ field }: { field: Field }): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: field.name,
    data: { field }
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 9999 : undefined
  }

  const isDimension = field.type === 'dimension'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="no-drag group flex items-center gap-2 px-2 py-1.5 rounded-macos-sm hover:bg-macos-border cursor-grab active:cursor-grabbing text-sm text-macos-text transition-colors"
    >
      <span
        className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${
          isDimension
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-green-500/20 text-green-400'
        }`}
      >
        {isDimension ? 'D' : 'M'}
      </span>
      <span className="flex-1 truncate text-xs">{field.name}</span>
      <span className="text-macos-text-secondary text-[10px] font-mono opacity-0 group-hover:opacity-50 transition-opacity shrink-0">
        {field.dataType}
      </span>
    </div>
  )
}
