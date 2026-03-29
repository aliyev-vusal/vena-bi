import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { Canvas } from './components/Canvas'

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'table'

const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 480
const SIDEBAR_DEFAULT = 256

function App(): React.JSX.Element {
  const [activeChart, setActiveChart] = useState<ChartType>('bar')
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const isResizing = useRef(false)

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent): void => {
      if (!isResizing.current) return
      const next = Math.min(Math.max(e.clientX, SIDEBAR_MIN), SIDEBAR_MAX)
      setSidebarWidth(next)
    }
    const onMouseUp = (): void => {
      if (!isResizing.current) return
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="flex h-full w-full overflow-hidden bg-macos-bg dark">
      {/* Resizable Sidebar */}
      <Sidebar width={sidebarWidth} />

      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        className="w-[4px] shrink-0 bg-macos-border hover:bg-macos-accent cursor-col-resize transition-colors duration-150"
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Toolbar activeChart={activeChart} onChartChange={setActiveChart} />
        <Canvas activeChart={activeChart} />
      </div>
    </div>
  )
}

export default App
