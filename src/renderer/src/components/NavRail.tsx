import React from 'react'

export type ViewType = 'report' | 'table' | 'model'

interface NavRailProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

export function NavRail({ activeView, onViewChange }: NavRailProps): React.JSX.Element {
  return (
    <nav className="w-12 shrink-0 bg-macos-sidebar border-r border-macos-border flex flex-col items-center z-10">
      {/* Traffic light spacer */}
      <div className="h-10 w-full drag-region" />

      <div className="flex flex-col items-center gap-1 pt-1">
        <NavButton
          view="report"
          active={activeView === 'report'}
          onClick={() => onViewChange('report')}
          title="Report View"
        >
          {/* Bar chart */}
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="10" width="4" height="11" rx="1" />
            <rect x="10" y="6"  width="4" height="15" rx="1" />
            <rect x="17" y="3" width="4" height="18" rx="1" />
          </svg>
        </NavButton>

        <NavButton
          view="table"
          active={activeView === 'table'}
          onClick={() => onViewChange('table')}
          title="Table View"
        >
          {/* Grid */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.8} />
            <line x1="3"  y1="8"  x2="21" y2="8"  strokeWidth={1.8} />
            <line x1="3"  y1="13" x2="21" y2="13" strokeWidth={1.8} />
            <line x1="3"  y1="18" x2="21" y2="18" strokeWidth={1.8} />
            <line x1="8"  y1="8"  x2="8"  y2="21" strokeWidth={1.8} />
          </svg>
        </NavButton>

        <NavButton
          view="model"
          active={activeView === 'model'}
          onClick={() => onViewChange('model')}
          title="Model View"
        >
          {/* Network / ERD */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="2"  y="9"  width="7" height="6" rx="1.5" strokeWidth={1.8} />
            <rect x="15" y="3"  width="7" height="6" rx="1.5" strokeWidth={1.8} />
            <rect x="15" y="15" width="7" height="6" rx="1.5" strokeWidth={1.8} />
            <line x1="9"  y1="12" x2="15" y2="6"  strokeWidth={1.6} strokeLinecap="round" />
            <line x1="9"  y1="12" x2="15" y2="18" strokeWidth={1.6} strokeLinecap="round" />
          </svg>
        </NavButton>
      </div>

      {/* Active indicator bar */}
      <div className="flex-1" />
    </nav>
  )
}

function NavButton({
  view,
  active,
  onClick,
  title,
  children
}: {
  view: ViewType
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  void view
  return (
    <button
      onClick={onClick}
      title={title}
      className={`no-drag relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150 ${
        active
          ? 'bg-macos-accent text-white shadow-sm'
          : 'text-macos-text-secondary hover:text-macos-text hover:bg-macos-border'
      }`}
    >
      {children}
    </button>
  )
}
