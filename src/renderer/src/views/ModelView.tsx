import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Node, Edge,
  useNodesState, useEdgesState,
  Background, Controls, MiniMap,
  BackgroundVariant, Handle, Position,
  EdgeLabelRenderer, BaseEdge, getSmoothStepPath,
  type EdgeProps, type NodeProps
} from '@xyflow/react'
import type { DataSource, Relationship } from '../App'
import { RelationshipModal } from '../components/RelationshipModal'

interface Props {
  dataSources: DataSource[]
  relationships: Relationship[]
  onAddRelationship: (rel: Omit<Relationship, 'id'>) => void
  onRemoveRelationship: (id: string) => void
}

// ─── Custom Table Node ───────────────────────────────────────────────────────

type TableNodeData = {
  source: DataSource
  colorIndex: number
}

const TABLE_COLORS = [
  '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316'
]

function TableNode({ data }: NodeProps<Node<TableNodeData>>): React.JSX.Element {
  const { source, colorIndex } = data
  const color = TABLE_COLORS[colorIndex % TABLE_COLORS.length]
  const dimensions = source.fields.filter((f) => f.type === 'dimension')
  const measures = source.fields.filter((f) => f.type === 'measure')

  return (
    <div
      className="rounded-lg overflow-hidden shadow-xl"
      style={{ width: 240, border: `1.5px solid ${color}33`, background: '#1c1c1e' }}
    >
      <Handle type="target" position={Position.Left}  style={{ background: color, border: 'none', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} style={{ background: color, border: 'none', width: 10, height: 10 }} />

      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-2" style={{ background: `${color}22`, borderBottom: `1px solid ${color}33` }}>
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{source.fileName}</p>
          <p className="text-[10px] font-mono opacity-50 text-white truncate">{source.tableName}</p>
        </div>
        <span className="text-[10px] text-white/40 shrink-0">
          {source.fields.length} cols
        </span>
      </div>

      {/* Columns */}
      <div className="max-h-64 overflow-y-auto divide-y" style={{ divideColor: '#2c2c2e' }}>
        {dimensions.map((f) => (
          <div key={f.name} className="flex items-center gap-2 px-3 py-1.5">
            <span className="w-3.5 h-3.5 rounded text-[8px] font-bold flex items-center justify-center shrink-0 bg-blue-500/20 text-blue-400">D</span>
            <span className="flex-1 text-[11px] text-gray-200 truncate">{f.name}</span>
            <span className="text-[10px] font-mono text-gray-500 shrink-0">{f.dataType}</span>
          </div>
        ))}
        {measures.map((f) => (
          <div key={f.name} className="flex items-center gap-2 px-3 py-1.5">
            <span className="w-3.5 h-3.5 rounded text-[8px] font-bold flex items-center justify-center shrink-0 bg-green-500/20 text-green-400">M</span>
            <span className="flex-1 text-[11px] text-gray-200 truncate">{f.name}</span>
            <span className="text-[10px] font-mono text-gray-500 shrink-0">{f.dataType}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: '#161618', borderTop: '1px solid #2c2c2e' }}>
        <span className="text-[10px] text-gray-500">{source.rowCount.toLocaleString()} rows</span>
      </div>
    </div>
  )
}

const nodeTypes = { tableNode: TableNode }

// ─── Custom Relationship Edge ─────────────────────────────────────────────────

function RelationshipEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data, markerEnd
}: EdgeProps): React.JSX.Element {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd}
        style={{ stroke: '#0ea5e9', strokeWidth: 1.5, strokeDasharray: '6 3' }} />
      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-all"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          <div className="px-2 py-0.5 rounded text-[10px] bg-[#1c1c1e] border border-[#0ea5e933] text-[#0ea5e9] font-mono whitespace-nowrap cursor-pointer hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-colors"
            title="Click to remove"
            onClick={() => (data as { onRemove: () => void }).onRemove?.()}
          >
            {(data as { label: string }).label}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const edgeTypes = { relEdge: RelationshipEdge }

// ─── Main ModelView ───────────────────────────────────────────────────────────

export function ModelView({ dataSources, relationships, onAddRelationship, onRemoveRelationship }: Props): React.JSX.Element {
  const [showRelModal, setShowRelModal] = useState(false)

  const initialNodes = useMemo<Node[]>(() =>
    dataSources.map((src, i) => ({
      id: src.id,
      type: 'tableNode',
      position: { x: (i % 3) * 300 + 60, y: Math.floor(i / 3) * 380 + 60 },
      data: { source: src, colorIndex: i } as TableNodeData
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataSources.map((s) => s.id).join(',')]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState([])

  // Sync nodes when dataSources change (add/remove), preserve positions
  useEffect(() => {
    setNodes((prev) => {
      const prevMap = new Map(prev.map((n) => [n.id, n]))
      return dataSources.map((src, i) => {
        const existing = prevMap.get(src.id)
        return existing
          ? { ...existing, data: { source: src, colorIndex: i } as TableNodeData }
          : {
              id: src.id,
              type: 'tableNode',
              position: { x: (i % 3) * 300 + 60, y: Math.floor(i / 3) * 380 + 60 },
              data: { source: src, colorIndex: i } as TableNodeData
            }
      })
    })
  }, [dataSources, setNodes])

  // Sync edges from relationships
  const computedEdges = useMemo<Edge[]>(() =>
    relationships.map((rel) => ({
      id: rel.id,
      source: rel.fromTable,
      target: rel.toTable,
      type: 'relEdge',
      data: {
        label: `${rel.fromColumn} → ${rel.toColumn}`,
        onRemove: () => onRemoveRelationship(rel.id)
      }
    })),
    [relationships, onRemoveRelationship]
  )

  const handleAddRelationship = useCallback(
    (rel: Omit<Relationship, 'id'>) => {
      onAddRelationship(rel)
      setShowRelModal(false)
    },
    [onAddRelationship]
  )

  const hasMultipleSources = dataSources.length >= 2

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-macos-bg">
      {/* Header */}
      <div className="h-11 bg-macos-toolbar border-b border-macos-border flex items-center px-4 gap-3 shrink-0 drag-region">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-macos-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="2" y="9" width="7" height="6" rx="1.5" strokeWidth={1.8} />
            <rect x="15" y="3" width="7" height="6" rx="1.5" strokeWidth={1.8} />
            <rect x="15" y="15" width="7" height="6" rx="1.5" strokeWidth={1.8} />
            <line x1="9" y1="12" x2="15" y2="6" strokeWidth={1.6} strokeLinecap="round" />
            <line x1="9" y1="12" x2="15" y2="18" strokeWidth={1.6} strokeLinecap="round" />
          </svg>
          <span className="text-sm font-semibold text-macos-text">Model View</span>
        </div>

        <div className="flex items-center gap-2 ml-4 text-[11px] text-macos-text-secondary">
          <span>{dataSources.length} table{dataSources.length !== 1 ? 's' : ''}</span>
          <span className="opacity-40">·</span>
          <span>{relationships.length} relationship{relationships.length !== 1 ? 's' : ''}</span>
        </div>

        {hasMultipleSources && (
          <button
            onClick={() => setShowRelModal(true)}
            className="no-drag ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-macos-sm bg-macos-accent hover:bg-blue-500 text-white text-[11px] font-medium transition-all shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Relationship
          </button>
        )}
      </div>

      {/* Flow canvas */}
      <div className="flex-1">
        {dataSources.length === 0 ? (
          <EmptyModel />
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={computedEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            colorMode="dark"
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
            <Controls
              style={{ background: '#2c2c2e', border: '1px solid #3a3a3c', borderRadius: 8 }}
              showInteractive={false}
            />
            <MiniMap
              nodeColor={(n) => {
                const d = n.data as TableNodeData
                return TABLE_COLORS[d.colorIndex % TABLE_COLORS.length]
              }}
              maskColor="rgba(0,0,0,0.6)"
              style={{ background: '#1c1c1e', border: '1px solid #3a3a3c', borderRadius: 8 }}
            />
          </ReactFlow>
        )}
      </div>

      {showRelModal && dataSources.length >= 2 && (
        <RelationshipModal
          dataSources={dataSources}
          onSave={handleAddRelationship}
          onClose={() => setShowRelModal(false)}
        />
      )}
    </div>
  )
}

function EmptyModel(): React.JSX.Element {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-macos-text-secondary">
      <svg className="w-14 h-14 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="2" y="9" width="7" height="6" rx="1.5" strokeWidth={1.5} />
        <rect x="15" y="3" width="7" height="6" rx="1.5" strokeWidth={1.5} />
        <rect x="15" y="15" width="7" height="6" rx="1.5" strokeWidth={1.5} />
        <line x1="9" y1="12" x2="15" y2="6" strokeWidth={1.4} strokeLinecap="round" />
        <line x1="9" y1="12" x2="15" y2="18" strokeWidth={1.4} strokeLinecap="round" />
      </svg>
      <p className="text-sm font-medium">No tables loaded</p>
      <p className="text-xs opacity-50">Open CSV/Parquet files from Report View to see them here</p>
    </div>
  )
}
