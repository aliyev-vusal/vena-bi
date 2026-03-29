import React from 'react'

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'table'

interface ToolbarProps {
  activeChart: ChartType
  onChartChange: (type: ChartType) => void
}

const chartTypes: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  {
    type: 'bar',
    label: 'Çubuk',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="12" width="4" height="9" rx="1" />
        <rect x="10" y="7" width="4" height="14" rx="1" />
        <rect x="17" y="4" width="4" height="17" rx="1" />
      </svg>
    )
  },
  {
    type: 'line',
    label: 'Çizgi',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <polyline points="3,17 8,10 13,13 21,5" strokeWidth={2} strokeLinecap="round" />
      </svg>
    )
  },
  {
    type: 'pie',
    label: 'Pasta',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 0 1 10 10H12V2z" />
        <path d="M12 12L4.93 17.07A10 10 0 0 1 12 2v10z" opacity={0.5} />
        <path d="M12 12v10a10 10 0 0 1-7.07-2.93L12 12z" opacity={0.3} />
      </svg>
    )
  },
  {
    type: 'scatter',
    label: 'Nokta',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="6" cy="18" r="2" />
        <circle cx="10" cy="10" r="2" />
        <circle cx="16" cy="14" r="2" />
        <circle cx="19" cy="6" r="2" />
      </svg>
    )
  },
  {
    type: 'table',
    label: 'Tablo',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <header className="h-12 bg-macos-toolbar border-b border-macos-border flex items-center px-4 gap-3 shrink-0 drag-region">
      {/* Window title - center aligned macOS style */}
      <div className="flex-1 flex justify-center">
        <span className="text-sm font-semibold text-macos-text-secondary drag-region">
          VENA BI
        </span>
      </div>

      {/* Chart type selector */}
      <div className="no-drag flex items-center gap-1 bg-macos-surface rounded-macos-sm p-1">
        {chartTypes.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => onChartChange(type)}
            title={label}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeChart === type
                ? 'bg-macos-accent text-white'
                : 'text-macos-text-secondary hover:text-macos-text hover:bg-macos-border'
            }`}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="no-drag flex items-center gap-2">
        <button className="px-3 py-1.5 rounded-macos-sm bg-macos-accent hover:bg-blue-500 text-white text-xs font-medium transition-colors">
          Yenile
        </button>
      </div>
    </header>
  )
}
