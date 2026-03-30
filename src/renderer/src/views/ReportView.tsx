import React, { useState, useRef, useCallback, useEffect } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { RightPane } from '../components/report/RightPane'
import { VisualWidget } from '../components/report/VisualWidget'
import { PowerQueryWindow } from '../components/PowerQueryWindow'
import { makeVisual, VIS_META, type Visual, type VisualType, type VisualFormat } from '../types/visual'
import type { DataSource, Measure, Relationship, AxisField } from '../App'

const CANVAS_W = 4000
const CANVAS_H = 3000

interface Props {
  dataSources: DataSource[]
  activeSourceId: string | null
  measures: Measure[]
  relationships: Relationship[]
  onSelectSource: (id: string) => void
  onRemoveSource: (id: string) => void
  onAddSource: () => void
  onAddMeasure: (name: string, expression: string) => void
  onRemoveMeasure: (id: string) => void
  onAddRelationship: (rel: Omit<Relationship, 'id'>) => void
  onRemoveRelationship: (id: string) => void
  onSourceUpdated: (updated: DataSource) => void
}

export function ReportView({
  dataSources, activeSourceId, measures, relationships,
  onSelectSource, onRemoveSource, onAddSource,
  onAddMeasure, onRemoveMeasure,
  onAddRelationship, onRemoveRelationship,
  onSourceUpdated
}: Props): React.JSX.Element {
  const [visuals, setVisuals]       = useState<Visual[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [etlSource, setEtlSource]   = useState<DataSource | null>(null)
  const nextPos = useRef({ x: 32, y: 32 })

  const selectedVisual = visuals.find((v) => v.id === selectedId) ?? null
  const activeSource   = dataSources.find((s) => s.id === activeSourceId) ?? null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

  // ── DnD ────────────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const overId = String(over.id)
    if (!overId.startsWith('bucket__')) return

    // "bucket__" is 8 chars, then: visualId__bucketId
    const rest = overId.slice(8)
    const sep  = rest.indexOf('__')
    if (sep === -1) return

    const visualId  = rest.slice(0, sep)
    const bucketId  = rest.slice(sep + 2)
    const axisField = active.data.current as AxisField
    if (!axisField || !visualId || !bucketId) return

    setVisuals((prev) =>
      prev.map((v) => {
        if (v.id !== visualId) return v
        const bucketDef = VIS_META[v.type].buckets.find((b) => b.id === bucketId)
        if (!bucketDef) return v
        const existing = v.fields[bucketId] ?? []
        if (bucketDef.multi) {
          // Avoid duplicates in multi-buckets
          const isDup = existing.some(
            (f) => f.fieldName === axisField.fieldName && f.tableName === axisField.tableName
          )
          if (isDup) return v
          return { ...v, fields: { ...v.fields, [bucketId]: [...existing, axisField] } }
        }
        return { ...v, fields: { ...v.fields, [bucketId]: [axisField] } }
      })
    )
    setSelectedId(visualId)
  }, [])

  // ── Visual CRUD ────────────────────────────────────────────────────────────
  const addVisual = useCallback((type: VisualType) => {
    const { x, y } = nextPos.current
    const vis = makeVisual(type, x, y)
    setVisuals((prev) => [...prev, vis])
    setSelectedId(vis.id)
    nextPos.current = {
      x: (x + 440) % (CANVAS_W - 500),
      y: y + ((x + 440) >= CANVAS_W - 500 ? 320 : 0)
    }
  }, [])

  const changeType = useCallback((type: VisualType) => {
    if (!selectedId) return
    setVisuals((prev) =>
      prev.map((v) => v.id === selectedId ? { ...v, type, fields: {} } : v)
    )
  }, [selectedId])

  const updateFormat = useCallback((fmt: Partial<VisualFormat>) => {
    if (!selectedId) return
    setVisuals((prev) =>
      prev.map((v) => v.id === selectedId ? { ...v, format: { ...v.format, ...fmt } } : v)
    )
  }, [selectedId])

  const removeField = useCallback((bucketId: string, index: number) => {
    if (!selectedId) return
    setVisuals((prev) =>
      prev.map((v) => {
        if (v.id !== selectedId) return v
        const arr = [...(v.fields[bucketId] ?? [])]
        arr.splice(index, 1)
        return { ...v, fields: { ...v.fields, [bucketId]: arr } }
      })
    )
  }, [selectedId])

  const moveVisual   = useCallback((id: string, x: number, y: number) =>
    setVisuals((prev) => prev.map((v) => v.id === id ? { ...v, position: { x, y } } : v)), [])

  const resizeVisual = useCallback((id: string, width: number, height: number) =>
    setVisuals((prev) => prev.map((v) => v.id === id ? { ...v, size: { width, height } } : v)), [])

  const deleteVisual = useCallback((id: string) => {
    setVisuals((prev) => prev.filter((v) => v.id !== id))
    setSelectedId((prev) => (prev === id ? null : prev))
  }, [])

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden min-w-0">
          {/* ── Canvas ──────────────────────────────────────────── */}
          <div className="flex-1 overflow-auto" style={{ background: '#141414' }}>
            <div
              className="relative select-none"
              style={{ width: CANVAS_W, height: CANVAS_H }}
              onClick={() => setSelectedId(null)}
            >
              {/* Dot grid */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
                  backgroundSize: '28px 28px'
                }}
              />

              {/* Empty state */}
              {visuals.length === 0 && (
                <div
                  className="absolute pointer-events-none flex flex-col items-center justify-center gap-3"
                  style={{ top: '28%', left: '50%', transform: 'translateX(-50%)' }}
                >
                  <svg width="52" height="52" fill="none" stroke="rgba(255,255,255,0.08)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                  <p className="text-[13px] text-white opacity-[0.08] font-medium">
                    Click a chart type in the right panel to add a visual
                  </p>
                </div>
              )}

              {visuals.map((vis) => (
                <VisualWidget
                  key={vis.id}
                  visual={vis}
                  isSelected={selectedId === vis.id}
                  onSelect={() => setSelectedId(vis.id)}
                  onMove={(x, y) => moveVisual(vis.id, x, y)}
                  onResize={(w, h) => resizeVisual(vis.id, w, h)}
                  onDelete={() => deleteVisual(vis.id)}
                />
              ))}
            </div>
          </div>

          {/* ── Right pane ────────────────────────────────────────── */}
          <RightPane
            selectedVisual={selectedVisual}
            dataSources={dataSources}
            activeSourceId={activeSourceId}
            measures={measures}
            relationships={relationships}
            onAddVisual={addVisual}
            onChangeType={changeType}
            onUpdateFormat={updateFormat}
            onRemoveField={removeField}
            onSelectSource={onSelectSource}
            onAddSource={onAddSource}
            onRemoveSource={onRemoveSource}
            onOpenETL={(src) => setEtlSource(src)}
            onAddMeasure={onAddMeasure}
            onRemoveMeasure={onRemoveMeasure}
            onAddRelationship={onAddRelationship}
            onRemoveRelationship={onRemoveRelationship}
          />
        </div>
      </DndContext>

      {/* ── Power Query / ETL window ─────────────────────────── */}
      {etlSource && (
        <PowerQueryWindow
          source={etlSource}
          onClose={() => setEtlSource(null)}
          onApplied={(updated) => {
            onSourceUpdated(updated)
            setEtlSource(null)
          }}
        />
      )}
    </>
  )
}
