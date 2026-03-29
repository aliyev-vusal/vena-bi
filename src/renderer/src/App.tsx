import React, { useState, useRef, useCallback, useEffect } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { Canvas } from './components/Canvas'

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'table'

interface Field {
  name: string
  type: 'dimension' | 'measure'
  dataType: string
}

interface DataSource {
  filePath: string
  rowCount: number
}

const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 480
const SIDEBAR_DEFAULT = 256

function App(): React.JSX.Element {
  const [activeChart, setActiveChart] = useState<ChartType>('bar')
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const [fields, setFields] = useState<Field[]>([])
  const [dataSource, setDataSource] = useState<DataSource | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [xField, setXField] = useState<string | null>(null)
  const [yField, setYField] = useState<string | null>(null)
  const isResizing = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const fieldName = active.id as string
    if (over.id === 'x-axis') setXField(fieldName)
    else if (over.id === 'y-axis') setYField(fieldName)
  }, [])

  const clearField = useCallback((role: 'x' | 'y') => {
    if (role === 'x') setXField(null)
    else setYField(null)
  }, [])

  const clearDataSource = useCallback(() => {
    setDataSource(null)
    setFields([])
    setXField(null)
    setYField(null)
    setLoadError(null)
  }, [])

  const openFile = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const result = await window.api.openFile()
      if (result.success) {
        setFields(result.fields)
        setDataSource({ filePath: result.filePath, rowCount: result.rowCount })
        setXField(null)
        setYField(null)
      } else if (!result.canceled) {
        setLoadError(result.error)
      }
    } catch (err) {
      setLoadError(String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Listen for Cmd+O from the native menu
  useEffect(() => {
    const unsub = window.api.onMenuOpenFile(openFile)
    return unsub
  }, [openFile])

  // Sidebar resize
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent): void => {
      if (!isResizing.current) return
      setSidebarWidth(Math.min(Math.max(e.clientX, SIDEBAR_MIN), SIDEBAR_MAX))
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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full w-full overflow-hidden bg-macos-bg dark">
        <Sidebar width={sidebarWidth} fields={fields} dataSource={dataSource} onClearDataSource={clearDataSource} />

        {/* Resize handle */}
        <div
          onMouseDown={startResize}
          className="w-[4px] shrink-0 bg-macos-border hover:bg-macos-accent cursor-col-resize transition-colors duration-150"
        />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Toolbar
            activeChart={activeChart}
            onChartChange={setActiveChart}
            onOpenFile={openFile}
            isLoading={isLoading}
            dataSource={dataSource}
          />

          {loadError && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-macos-sm bg-red-500/10 border border-red-500/30 text-red-400 text-xs shrink-0">
              Failed to load file: {loadError}
            </div>
          )}

          <Canvas
            activeChart={activeChart}
            xField={xField}
            yField={yField}
            onClearField={clearField}
          />
        </div>
      </div>
    </DndContext>
  )
}

export default App
