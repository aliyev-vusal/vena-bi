import React from 'react'

interface Field {
  name: string
  type: 'dimension' | 'measure'
  dataType: string
}

interface SidebarProps {
  fields?: Field[]
  width: number
}

const mockFields: Field[] = [
  { name: 'Date', type: 'dimension', dataType: 'DATE' },
  { name: 'Country', type: 'dimension', dataType: 'VARCHAR' },
  { name: 'Category', type: 'dimension', dataType: 'VARCHAR' },
  { name: 'Sales', type: 'measure', dataType: 'DOUBLE' },
  { name: 'Quantity', type: 'measure', dataType: 'INTEGER' },
  { name: 'Profit', type: 'measure', dataType: 'DOUBLE' }
]

export function Sidebar({ fields = mockFields, width }: SidebarProps): React.JSX.Element {
  const dimensions = fields.filter((f) => f.type === 'dimension')
  const measures = fields.filter((f) => f.type === 'measure')

  return (
    <aside
      style={{ width }}
      className="shrink-0 bg-macos-sidebar flex flex-col select-none overflow-hidden"
    >
      {/* Traffic light spacer — macOS title bar area */}
      <div className="h-10 drag-region" />

      {/* Data source header */}
      <div className="px-3 pb-3 border-b border-macos-border">
        <p className="text-[10px] font-semibold text-macos-text-secondary uppercase tracking-widest mb-2 px-1">
          Data Source
        </p>
        <button
          className="no-drag w-full flex items-center gap-2 px-3 py-2 rounded-macos-sm bg-macos-border hover:bg-opacity-70 active:scale-[0.98] text-macos-text text-xs font-medium transition-all"
          onClick={() => window.electron?.ipcRenderer.send('open-file')}
        >
          <svg className="w-3.5 h-3.5 text-macos-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="truncate">Open CSV / Parquet…</span>
        </button>
      </div>

      {/* Fields list */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        <FieldGroup label="Dimensions" fields={dimensions} />
        <FieldGroup label="Measures" fields={measures} />
      </div>
    </aside>
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
  const handleDragStart = (e: React.DragEvent): void => {
    e.dataTransfer.setData('text/plain', field.name)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const isDimension = field.type === 'dimension'

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="no-drag group flex items-center gap-2 px-2 py-1.5 rounded-macos-sm hover:bg-macos-border cursor-grab active:cursor-grabbing text-sm text-macos-text transition-colors"
    >
      {/* Type badge */}
      <span
        className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${
          isDimension
            ? 'bg-blue-500 bg-opacity-20 text-blue-400'
            : 'bg-green-500 bg-opacity-20 text-green-400'
        }`}
      >
        {isDimension ? 'D' : 'M'}
      </span>

      <span className="flex-1 truncate text-xs">{field.name}</span>

      <span className="text-macos-text-secondary text-[10px] font-mono opacity-0 group-hover:opacity-60 transition-opacity shrink-0">
        {field.dataType}
      </span>
    </div>
  )
}
