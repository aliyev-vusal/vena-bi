import React, { useState, useCallback, useEffect } from 'react'
import { NavRail, type ViewType } from './components/NavRail'
import { TableView } from './views/TableView'
import { ModelView } from './views/ModelView'
import { ReportView } from './views/ReportView'

export interface Field {
  name: string
  type: 'dimension' | 'measure'
  dataType: string
}

export interface DataSource {
  id: string
  tableName: string
  filePath: string
  fileName: string
  rowCount: number
  fields: Field[]
}

export interface Measure {
  id: string
  name: string
  expression: string
}

export interface Relationship {
  id: string
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
}

export interface AxisField {
  fieldName: string
  tableName: string
  isMeasure: boolean
  measureExpression?: string
  dataType?: string
}

function App(): React.JSX.Element {
  const [activeView, setActiveView] = useState<ViewType>('report')
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)
  const [measures, setMeasures] = useState<Measure[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    window.api.getMeasures().then(setMeasures)
    window.api.getRelationships().then(setRelationships)
  }, [])

  const selectSource = useCallback((id: string) => {
    setActiveSourceId(id)
  }, [])

  const removeSource = useCallback((id: string) => {
    window.api.dropTable(id)
    setDataSources((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (activeSourceId === id) {
        setActiveSourceId(next[next.length - 1]?.id ?? null)
      }
      return next
    })
  }, [activeSourceId])

  const updateSource = useCallback((updated: DataSource) => {
    setDataSources((prev) => prev.map((s) => s.id === updated.id ? updated : s))
  }, [])

  const openFile = useCallback(async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const result = await window.api.openFile()
      if (result.success) {
        const source: DataSource = {
          id: result.tableName,
          tableName: result.tableName,
          filePath: result.filePath,
          fileName: result.filePath.split('/').pop() ?? result.filePath,
          rowCount: result.rowCount,
          fields: result.fields
        }
        setDataSources((prev) => [...prev, source])
        setActiveSourceId(source.id)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  const addMeasure = useCallback(async (name: string, expression: string) => {
    const m = await window.api.addMeasure({ name, expression })
    setMeasures((prev) => [...prev, m])
  }, [])

  const removeMeasure = useCallback(async (id: string) => {
    await window.api.removeMeasure(id)
    setMeasures((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const addRelationship = useCallback(async (rel: Omit<Relationship, 'id'>) => {
    const r = await window.api.addRelationship(rel)
    setRelationships((prev) => [...prev, r])
  }, [])

  const removeRelationship = useCallback(async (id: string) => {
    await window.api.removeRelationship(id)
    setRelationships((prev) => prev.filter((r) => r.id !== id))
  }, [])

  useEffect(() => {
    const unsub = window.api.onMenuOpenFile(openFile)
    return unsub
  }, [openFile])

  return (
    <div className="flex h-full w-full overflow-hidden bg-macos-bg dark">
      {/* Left nav rail — always visible */}
      <NavRail activeView={activeView} onViewChange={setActiveView} />

      {/* ── Report View ─────────────────────────────────────────── */}
      {activeView === 'report' && (
        <ReportView
          dataSources={dataSources}
          activeSourceId={activeSourceId}
          measures={measures}
          relationships={relationships}
          onSelectSource={selectSource}
          onRemoveSource={removeSource}
          onAddSource={openFile}
          onAddMeasure={addMeasure}
          onRemoveMeasure={removeMeasure}
          onAddRelationship={addRelationship}
          onRemoveRelationship={removeRelationship}
          onSourceUpdated={updateSource}
        />
      )}

      {/* ── Table View ──────────────────────────────────────────── */}
      {activeView === 'table' && (
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TableView dataSources={dataSources} />
        </div>
      )}

      {/* ── Model View ──────────────────────────────────────────── */}
      {activeView === 'model' && (
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ModelView
            dataSources={dataSources}
            relationships={relationships}
            onAddRelationship={addRelationship}
            onRemoveRelationship={removeRelationship}
          />
        </div>
      )}
    </div>
  )
}

export default App
