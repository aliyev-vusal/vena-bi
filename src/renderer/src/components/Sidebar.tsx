import React from 'react'

interface Field {
  name: string
  type: 'dimension' | 'measure'
  dataType: string
}

interface SidebarProps {
  fields: Field[]
}

const mockFields: Field[] = [
  { name: 'Tarih', type: 'dimension', dataType: 'DATE' },
  { name: 'Ülke', type: 'dimension', dataType: 'VARCHAR' },
  { name: 'Kategori', type: 'dimension', dataType: 'VARCHAR' },
  { name: 'Satış', type: 'measure', dataType: 'DOUBLE' },
  { name: 'Adet', type: 'measure', dataType: 'INTEGER' },
  { name: 'Kâr', type: 'measure', dataType: 'DOUBLE' }
]

export function Sidebar({ fields = mockFields }: SidebarProps): React.JSX.Element {
  const dimensions = fields.filter((f) => f.type === 'dimension')
  const measures = fields.filter((f) => f.type === 'measure')

  return (
    <aside className="w-64 bg-macos-sidebar border-r border-macos-border flex flex-col shrink-0 select-none">
      {/* Traffic light spacer - macOS title bar area */}
      <div className="h-10 drag-region" />

      {/* Data source header */}
      <div className="px-4 py-3 border-b border-macos-border">
        <p className="text-xs font-semibold text-macos-text-secondary uppercase tracking-wider mb-2">
          Veri Kaynağı
        </p>
        <button className="no-drag w-full flex items-center gap-2 px-3 py-2 rounded-macos-sm bg-macos-border hover:bg-opacity-80 text-macos-text text-sm transition-colors">
          <svg
            className="w-4 h-4 text-macos-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Dosya Yükle
        </button>
      </div>

      {/* Fields list */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {/* Dimensions */}
        <div className="mb-4">
          <p className="px-2 mb-1 text-xs font-semibold text-macos-text-secondary uppercase tracking-wider">
            Boyutlar
          </p>
          {dimensions.map((field) => (
            <FieldItem key={field.name} field={field} />
          ))}
        </div>

        {/* Measures */}
        <div>
          <p className="px-2 mb-1 text-xs font-semibold text-macos-text-secondary uppercase tracking-wider">
            Ölçümler
          </p>
          {measures.map((field) => (
            <FieldItem key={field.name} field={field} />
          ))}
        </div>
      </div>
    </aside>
  )
}

function FieldItem({ field }: { field: Field }): React.JSX.Element {
  return (
    <div
      draggable
      className="no-drag flex items-center gap-2 px-2 py-1.5 rounded-macos-sm hover:bg-macos-border cursor-grab active:cursor-grabbing text-sm text-macos-text transition-colors group"
    >
      {field.type === 'dimension' ? (
        <span className="text-blue-400 font-mono text-xs">D</span>
      ) : (
        <span className="text-green-400 font-mono text-xs">M</span>
      )}
      <span className="flex-1 truncate">{field.name}</span>
      <span className="text-macos-text-secondary text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        {field.dataType}
      </span>
    </div>
  )
}
