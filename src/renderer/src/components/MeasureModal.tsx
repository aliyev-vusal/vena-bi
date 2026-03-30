import React, { useState, useRef, useEffect } from 'react'
import type { DataSource } from '../App'

interface Props {
  dataSources: DataSource[]
  onSave: (name: string, expression: string) => void
  onClose: () => void
}

export function MeasureModal({ dataSources, onSave, onClose }: Props): React.JSX.Element {
  const [name, setName] = useState('')
  const [expression, setExpression] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const insertRef = (tableName: string, colName: string): void => {
    const snippet = `"${tableName}"."${colName}"`
    setExpression((prev) => prev + snippet)
  }

  const handleSave = (): void => {
    const n = name.trim()
    const e = expression.trim()
    if (!n || !e) return
    onSave(n, e)
    onClose()
  }

  const valid = name.trim().length > 0 && expression.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[540px] max-h-[80vh] bg-macos-surface border border-macos-border rounded-macos shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-macos-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-macos-text">New Measure</h2>
            <p className="text-[11px] text-macos-text-secondary mt-0.5">Define a calculated field using SQL aggregates</p>
          </div>
          <button onClick={onClose} className="text-macos-text-secondary hover:text-macos-text transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-medium text-macos-text-secondary mb-1.5 uppercase tracking-wider">
              Name
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Total Revenue, Profit Margin"
              className="w-full px-3 py-2 rounded-macos-sm bg-macos-bg border border-macos-border text-sm text-macos-text placeholder:text-macos-text-secondary/50 focus:outline-none focus:border-macos-accent transition-colors"
            />
          </div>

          {/* Expression */}
          <div>
            <label className="block text-[11px] font-medium text-macos-text-secondary mb-1.5 uppercase tracking-wider">
              SQL Expression
            </label>
            <textarea
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleSave()}
              placeholder={'e.g.  SUM("src_0"."Revenue")\nor  SUM("src_0"."Profit") / SUM("src_0"."Revenue")'}
              rows={3}
              className="w-full px-3 py-2 rounded-macos-sm bg-macos-bg border border-macos-border text-sm text-macos-text font-mono placeholder:text-macos-text-secondary/40 focus:outline-none focus:border-macos-accent transition-colors resize-none"
            />
            <p className="text-[10px] text-macos-text-secondary mt-1 opacity-60">
              Use SQL aggregate functions: SUM, AVG, COUNT, MIN, MAX. Press ⌘↵ to save.
            </p>
          </div>

          {/* Column reference helper */}
          {dataSources.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-macos-text-secondary uppercase tracking-wider mb-2">
                Available Columns — click to insert
              </p>
              <div className="space-y-2">
                {dataSources.map((src) => (
                  <div key={src.id}>
                    <p className="text-[10px] text-macos-accent font-mono mb-1">{src.tableName} — {src.fileName}</p>
                    <div className="flex flex-wrap gap-1">
                      {src.fields.map((f) => (
                        <button
                          key={f.name}
                          onClick={() => insertRef(src.tableName, f.name)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                            f.type === 'measure'
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                          }`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-macos-border shrink-0">
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
            Save Measure
          </button>
        </div>
      </div>
    </div>
  )
}
