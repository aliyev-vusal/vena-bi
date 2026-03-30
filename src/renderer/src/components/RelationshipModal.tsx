import React, { useState } from 'react'
import type { DataSource, Relationship } from '../App'

interface Props {
  dataSources: DataSource[]
  onSave: (rel: Omit<Relationship, 'id'>) => void
  onClose: () => void
}

export function RelationshipModal({ dataSources, onSave, onClose }: Props): React.JSX.Element {
  const [fromTable, setFromTable] = useState(dataSources[0]?.id ?? '')
  const [fromColumn, setFromColumn] = useState('')
  const [toTable, setToTable] = useState(dataSources[1]?.id ?? dataSources[0]?.id ?? '')
  const [toColumn, setToColumn] = useState('')

  const fromSrc = dataSources.find((s) => s.id === fromTable)
  const toSrc = dataSources.find((s) => s.id === toTable)

  const handleFromTable = (id: string): void => {
    setFromTable(id)
    setFromColumn('')
    if (id === toTable) {
      const other = dataSources.find((s) => s.id !== id)
      setToTable(other?.id ?? '')
      setToColumn('')
    }
  }

  const handleToTable = (id: string): void => {
    setToTable(id)
    setToColumn('')
  }

  const valid = fromTable && fromColumn && toTable && toColumn && fromTable !== toTable

  const handleSave = (): void => {
    if (!valid) return
    onSave({ fromTable, fromColumn, toTable, toColumn })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[480px] bg-macos-surface border border-macos-border rounded-macos shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-macos-border">
          <div>
            <h2 className="text-sm font-semibold text-macos-text">Add Relationship</h2>
            <p className="text-[11px] text-macos-text-secondary mt-0.5">Join two tables on a common key column</p>
          </div>
          <button onClick={onClose} className="text-macos-text-secondary hover:text-macos-text transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Visual join preview */}
          <div className="flex items-center gap-3">
            <TableSelector
              label="From Table"
              sources={dataSources}
              value={fromTable}
              exclude={toTable}
              onChange={handleFromTable}
            />
            <div className="flex flex-col items-center gap-1 shrink-0">
              <svg className="w-5 h-5 text-macos-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="text-[9px] text-macos-text-secondary font-medium uppercase tracking-widest">LEFT JOIN</span>
            </div>
            <TableSelector
              label="To Table"
              sources={dataSources}
              value={toTable}
              exclude={fromTable}
              onChange={handleToTable}
            />
          </div>

          {/* Column pickers */}
          <div className="flex items-end gap-3">
            <ColumnSelector
              label="On column"
              fields={fromSrc?.fields ?? []}
              value={fromColumn}
              onChange={setFromColumn}
            />
            <div className="pb-2 text-macos-text-secondary text-sm shrink-0">=</div>
            <ColumnSelector
              label="Matches column"
              fields={toSrc?.fields ?? []}
              value={toColumn}
              onChange={setToColumn}
            />
          </div>

          {/* Preview SQL */}
          {valid && (
            <div className="px-3 py-2 rounded-macos-sm bg-macos-bg border border-macos-border font-mono text-[11px] text-macos-text-secondary leading-relaxed">
              <span className="text-purple-400">LEFT JOIN </span>
              <span className="text-macos-accent">"{toTable}"</span>
              <span className="text-purple-400"> ON </span>
              <span className="text-macos-accent">"{fromTable}"</span>
              <span>."{fromColumn}" = </span>
              <span className="text-macos-accent">"{toTable}"</span>
              <span>."{toColumn}"</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-macos-border">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-macos-sm text-xs font-medium text-macos-text-secondary hover:text-macos-text hover:bg-macos-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className="px-4 py-1.5 rounded-macos-sm text-xs font-medium bg-macos-accent hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
          >
            Add Relationship
          </button>
        </div>
      </div>
    </div>
  )
}

function TableSelector({ label, sources, value, exclude, onChange }: {
  label: string
  sources: DataSource[]
  value: string
  exclude: string
  onChange: (id: string) => void
}): React.JSX.Element {
  return (
    <div className="flex-1 min-w-0">
      <label className="block text-[10px] font-medium text-macos-text-secondary uppercase tracking-wider mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded-macos-sm bg-macos-bg border border-macos-border text-xs text-macos-text focus:outline-none focus:border-macos-accent"
      >
        {sources.filter((s) => s.id !== exclude).map((s) => (
          <option key={s.id} value={s.id}>{s.fileName}</option>
        ))}
      </select>
    </div>
  )
}

function ColumnSelector({ label, fields, value, onChange }: {
  label: string
  fields: DataSource['fields']
  value: string
  onChange: (v: string) => void
}): React.JSX.Element {
  return (
    <div className="flex-1 min-w-0">
      <label className="block text-[10px] font-medium text-macos-text-secondary uppercase tracking-wider mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded-macos-sm bg-macos-bg border border-macos-border text-xs text-macos-text focus:outline-none focus:border-macos-accent"
      >
        <option value="">— select —</option>
        {fields.map((f) => (
          <option key={f.name} value={f.name}>{f.name}</option>
        ))}
      </select>
    </div>
  )
}
