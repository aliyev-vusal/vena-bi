import React from 'react'

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'table'

interface ToolbarProps {
  activeChart: ChartType
  onChartChange: (type: ChartType) => void
}

const chartTypes: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  {
    type: 'bar',
    label: 'Bar',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="12" width="4" height="9" rx="1" />
        <rect x="10" y="7" width="4" height="14" rx="1" />
        <rect x="17" y="4" width="4" height="17" rx="1" />
      </svg>
    )
  },
  {
    type: 'line',
    label: 'Line',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <polyline points="3,17 8,10 13,13 21,5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    type: 'pie',
    label: 'Pie',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 0 1 10 10H12V2z" />
        <path d="M12 12L4.93 17.07A10 10 0 0 1 12 2v10z" opacity={0.5} />
        <path d="M12 12v10a10 10 0 0 1-7.07-2.93L12 12z" opacity={0.3} />
      </svg>
    )
  },
  {
    type: 'scatter',
    label: 'Scatter',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="6" cy="18" r="2" />
        <circle cx="10" cy="10" r="2" />
        <circle cx="16" cy="14" r="2" />
        <circle cx="19" cy="6" r="2" />
      </svg>
    )
  },
  {
    type: 'table',
    label: 'Table',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
        <line x1="3" y1="9" x2="21" y2="9" strokeWidth={2} />
        <line x1="3" y1="15" x2="21" y2="15" strokeWidth={2} />
        <line x1="9" y1="9" x2="9" y2="21" strokeWidth={2} />
      </svg>
    )
  }
]

export function Toolbar({ activeChart, onChartChange }: ToolbarProps): React.JSX.Element {
  return (
    <header className="h-11 bg-macos-toolbar border-b border-macos-border flex items-center px-4 gap-3 shrink-0 drag-region">
      {/* Left — app title (drag region) */}
      <div className="flex items-center gap-2 w-40 shrink-0">
        <span className="text-sm font-semibold text-macos-text tracking-tight">VENA BI</span>
      </div>

      {/* Center — chart type pill selector */}
      <div className="flex-1 flex justify-center">
        <div className="no-drag flex items-center gap-0.5 bg-macos-surface border border-macos-border rounded-macos-sm p-0.5">
          {chartTypes.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => onChartChange(type)}
              title={label}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-[5px] text-[11px] font-medium transition-all ${
                activeChart === type
                  ? 'bg-macos-accent text-white shadow-sm'
                  : 'text-macos-text-secondary hover:text-macos-text hover:bg-macos-border'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right — Open File button */}
      <div className="no-drag flex items-center gap-2 w-40 justify-end shrink-0">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-macos-sm bg-macos-accent hover:bg-blue-500 active:scale-[0.97] text-white text-[11px] font-medium transition-all"
          onClick={() => window.electron?.ipcRenderer.send('open-file')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
          Open File
        </button>
      </div>
    </header>
  )
}
