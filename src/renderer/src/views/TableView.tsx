import React, { useEffect, useState } from 'react'
import type { DataSource } from '../App'

interface Props {
  dataSources: DataSource[]
}

interface TableData {
  columns: { name: string; dataType: string }[]
  rows: unknown[][]
  total: number
}

const LIMIT = 2000

export function TableView({ dataSources }: Props): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string>(dataSources[0]?.id ?? '')
  const [data, setData] = useState<TableData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync selectedId when sources change
  useEffect(() => {
    if (!dataSources.find((s) => s.id === selectedId) && dataSources.length > 0) {
      setSelectedId(dataSources[0].id)
    }
  }, [dataSources, selectedId])

  useEffect(() => {
    if (!selectedId) { setData(null); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    window.api.fetchTableData(selectedId, LIMIT).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (result.success) setData({ columns: result.columns, rows: result.rows, total: result.total })
      else setError(result.error)
    })
    return () => { cancelled = true }
  }, [selectedId])

  const source = dataSources.find((s) => s.id === selectedId)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-macos-bg">
      {/* Header */}
      <div className="h-11 bg-macos-toolbar border-b border-macos-border flex items-center px-4 gap-3 shrink-0 drag-region">
        <div className="flex items-center gap-2 shrink-0">
          <svg className="w-4 h-4 text-macos-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.8} />
            <line x1="3" y1="8" x2="21" y2="8" strokeWidth={1.8} />
            <line x1="3" y1="13" x2="21" y2="13" strokeWidth={1.8} />
            <line x1="8" y1="8" x2="8" y2="21" strokeWidth={1.8} />
          </svg>
          <span className="text-sm font-semibold text-macos-text">Table View</span>
        </div>

        {/* Source tabs */}
        {dataSources.length > 0 && (
          <div className="no-drag flex items-center gap-0.5 bg-macos-surface border border-macos-border rounded-macos-sm p-0.5 ml-2">
            {dataSources.map((src) => (
              <button
                key={src.id}
                onClick={() => setSelectedId(src.id)}
                className={`px-3 py-1 rounded-[5px] text-[11px] font-medium transition-all max-w-[160px] truncate ${
                  selectedId === src.id
                    ? 'bg-macos-accent text-white shadow-sm'
                    : 'text-macos-text-secondary hover:text-macos-text hover:bg-macos-border'
                }`}
                title={src.filePath}
              >
                {src.fileName}
              </button>
            ))}
          </div>
        )}

        {/* Row info */}
        {data && (
          <span className="ml-auto text-[11px] text-macos-text-secondary shrink-0">
            {data.rows.length < data.total
              ? `Showing first ${data.rows.length.toLocaleString()} of ${data.total.toLocaleString()} rows`
              : `${data.total.toLocaleString()} rows`}
            {' · '}
            {data.columns.length} columns
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {dataSources.length === 0 ? (
          <EmptyState />
        ) : loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : data ? (
          <DataGrid data={data} sourceName={source?.fileName ?? selectedId} />
        ) : null}
      </div>
    </div>
  )
}

function DataGrid({ data }: { data: TableData; sourceName: string }): React.JSX.Element {
  return (
    <div className="w-full h-full overflow-auto">
      <table className="border-collapse text-xs" style={{ minWidth: '100%' }}>
        <thead className="sticky top-0 z-10">
          <tr className="bg-macos-sidebar">
            {/* Row number header */}
            <th className="w-12 px-3 py-2 text-right text-[10px] font-medium text-macos-text-secondary border-b border-r border-macos-border bg-macos-sidebar select-none">
              #
            </th>
            {data.columns.map((col) => (
              <th
                key={col.name}
                className="px-3 py-2 text-left font-semibold text-macos-text-secondary border-b border-r border-macos-border bg-macos-sidebar whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <TypeBadge dataType={col.dataType} />
                  <span>{col.name}</span>
                  <span className="font-normal font-mono text-[10px] opacity-40 ml-1">{col.dataType}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr
              key={ri}
              className={`group border-b border-macos-border/40 transition-colors ${
                ri % 2 === 0 ? 'bg-macos-bg' : 'bg-macos-surface/30'
              } hover:bg-macos-accent/10`}
            >
              <td className="px-3 py-1.5 text-right text-[10px] text-macos-text-secondary border-r border-macos-border/40 select-none tabular-nums">
                {ri + 1}
              </td>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-macos-text border-r border-macos-border/40 whitespace-nowrap max-w-[240px] truncate">
                  {cell === null || cell === undefined ? (
                    <span className="text-macos-text-secondary italic opacity-40">null</span>
                  ) : (
                    String(cell)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TypeBadge({ dataType }: { dataType: string }): React.JSX.Element {
  const upper = dataType.toUpperCase()
  const isNumeric = ['INT', 'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'BIGINT', 'REAL', 'HUGEINT'].some(
    (t) => upper === t || upper.startsWith(t)
  )
  const isDate = upper.startsWith('DATE') || upper.startsWith('TIME') || upper.startsWith('TIMESTAMP')
  const isBool = upper === 'BOOLEAN' || upper === 'BOOL'

  const color = isNumeric
    ? 'bg-green-500/20 text-green-400'
    : isDate
      ? 'bg-orange-500/20 text-orange-400'
      : isBool
        ? 'bg-purple-500/20 text-purple-400'
        : 'bg-blue-500/20 text-blue-400'

  const label = isNumeric ? '123' : isDate ? 'dt' : isBool ? 'T/F' : 'abc'

  return (
    <span className={`w-6 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0 ${color}`}>
      {label}
    </span>
  )
}

function EmptyState(): React.JSX.Element {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-macos-text-secondary">
      <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
        <line x1="3" y1="8" x2="21" y2="8" strokeWidth={1.5} />
        <line x1="3" y1="13" x2="21" y2="13" strokeWidth={1.5} />
        <line x1="8" y1="8" x2="8" y2="21" strokeWidth={1.5} />
      </svg>
      <p className="text-sm font-medium">No data sources loaded</p>
      <p className="text-xs opacity-50">Open a CSV or Parquet file from Report View</p>
    </div>
  )
}

function LoadingState(): React.JSX.Element {
  return (
    <div className="h-full flex items-center justify-center gap-2 text-macos-text-secondary">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
      </svg>
      <span className="text-sm">Loading data…</span>
    </div>
  )
}

function ErrorState({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 px-8">
      <p className="text-red-400 text-sm font-medium">Failed to load table</p>
      <p className="text-red-400/70 text-xs text-center">{message}</p>
    </div>
  )
}
