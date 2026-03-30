import type { AxisField } from '../App'

// ─── Visual Types ────────────────────────────────────────────────────────────

export type VisualType =
  | 'clusteredBar' | 'stackedBar' | 'bar100'
  | 'clusteredColumn' | 'stackedColumn' | 'column100'
  | 'line' | 'area' | 'stackedArea' | 'combo'
  | 'pie' | 'donut' | 'treemap' | 'waterfall' | 'funnel'
  | 'scatter' | 'gauge' | 'kpi'
  | 'table' | 'matrix' | 'card'
  | 'map' | 'wordCloud' | 'qna'

// ─── Bucket Definitions ───────────────────────────────────────────────────────

export interface BucketDef {
  id: string
  label: string
  multi: boolean
  hint: string
  required: boolean
}

// ─── Visual Meta ──────────────────────────────────────────────────────────────

export interface VisMeta {
  label: string
  category: 'bar' | 'line' | 'proportion' | 'statistical' | 'tabular' | 'other'
  buckets: BucketDef[]
  implemented: boolean
}

const xy: BucketDef[] = [
  { id: 'x', label: 'X Axis', multi: false, hint: 'Drag a dimension here', required: true },
  { id: 'y', label: 'Y Axis', multi: true,  hint: 'Drag a measure here',   required: true },
  { id: 'legend', label: 'Legend', multi: false, hint: 'Optional grouping', required: false },
  { id: 'tooltip', label: 'Tooltips', multi: true, hint: 'Extra hover info', required: false },
]

export const VIS_META: Record<VisualType, VisMeta> = {
  // ── Bar ──────────────────────────────────────────────────────────────────
  clusteredBar: {
    label: 'Clustered Bar', category: 'bar', implemented: true,
    buckets: xy
  },
  stackedBar: {
    label: 'Stacked Bar', category: 'bar', implemented: false,
    buckets: xy
  },
  bar100: {
    label: '100% Stacked Bar', category: 'bar', implemented: false,
    buckets: xy
  },
  // ── Column ───────────────────────────────────────────────────────────────
  clusteredColumn: {
    label: 'Clustered Column', category: 'bar', implemented: true,
    buckets: xy
  },
  stackedColumn: {
    label: 'Stacked Column', category: 'bar', implemented: false,
    buckets: xy
  },
  column100: {
    label: '100% Stacked Column', category: 'bar', implemented: false,
    buckets: xy
  },
  // ── Line / Area ───────────────────────────────────────────────────────────
  line: {
    label: 'Line Chart', category: 'line', implemented: true,
    buckets: xy
  },
  area: {
    label: 'Area Chart', category: 'line', implemented: true,
    buckets: xy
  },
  stackedArea: {
    label: 'Stacked Area', category: 'line', implemented: false,
    buckets: xy
  },
  combo: {
    label: 'Line & Column', category: 'line', implemented: false,
    buckets: [
      ...xy,
      { id: 'y2', label: 'Column Y', multi: true, hint: 'Column values', required: false },
    ]
  },
  // ── Proportion ────────────────────────────────────────────────────────────
  pie: {
    label: 'Pie Chart', category: 'proportion', implemented: true,
    buckets: [
      { id: 'legend', label: 'Legend',  multi: false, hint: 'Category dimension', required: true },
      { id: 'values', label: 'Values',  multi: false, hint: 'Aggregate measure',  required: true },
      { id: 'details', label: 'Details', multi: false, hint: 'Drill-down field', required: false },
    ]
  },
  donut: {
    label: 'Donut Chart', category: 'proportion', implemented: true,
    buckets: [
      { id: 'legend', label: 'Legend',  multi: false, hint: 'Category dimension', required: true },
      { id: 'values', label: 'Values',  multi: false, hint: 'Aggregate measure',  required: true },
    ]
  },
  treemap: {
    label: 'Treemap', category: 'proportion', implemented: false,
    buckets: [
      { id: 'category', label: 'Category', multi: false, hint: 'Group by', required: true },
      { id: 'values',   label: 'Values',   multi: true,  hint: 'Size', required: true },
    ]
  },
  waterfall: {
    label: 'Waterfall', category: 'proportion', implemented: false,
    buckets: xy
  },
  funnel: {
    label: 'Funnel', category: 'proportion', implemented: true,
    buckets: [
      { id: 'category', label: 'Category', multi: false, hint: 'Stage name', required: true },
      { id: 'values',   label: 'Values',   multi: false, hint: 'Stage value', required: true },
    ]
  },
  // ── Statistical ───────────────────────────────────────────────────────────
  scatter: {
    label: 'Scatter Chart', category: 'statistical', implemented: true,
    buckets: [
      { id: 'x',      label: 'X Axis',  multi: false, hint: 'X dimension',  required: true },
      { id: 'y',      label: 'Y Axis',  multi: false, hint: 'Y measure',    required: true },
      { id: 'size',   label: 'Size',    multi: false, hint: 'Bubble size',  required: false },
      { id: 'legend', label: 'Legend',  multi: false, hint: 'Color group',  required: false },
    ]
  },
  gauge: {
    label: 'Gauge', category: 'statistical', implemented: false,
    buckets: [
      { id: 'value',  label: 'Value',  multi: false, hint: 'Current value', required: true },
      { id: 'target', label: 'Target', multi: false, hint: 'Target value',  required: false },
    ]
  },
  kpi: {
    label: 'KPI', category: 'statistical', implemented: false,
    buckets: [
      { id: 'value',   label: 'Value',   multi: false, hint: 'Measure', required: true },
      { id: 'trend',   label: 'Trend',   multi: false, hint: 'Time axis', required: false },
      { id: 'target',  label: 'Target',  multi: false, hint: 'Goal', required: false },
    ]
  },
  // ── Tabular ───────────────────────────────────────────────────────────────
  table: {
    label: 'Table', category: 'tabular', implemented: true,
    buckets: [
      { id: 'columns', label: 'Columns', multi: true, hint: 'Drag fields to add columns', required: true },
    ]
  },
  matrix: {
    label: 'Matrix', category: 'tabular', implemented: false,
    buckets: [
      { id: 'rows',    label: 'Rows',    multi: true,  hint: 'Row headers', required: true },
      { id: 'columns', label: 'Columns', multi: true,  hint: 'Column headers', required: false },
      { id: 'values',  label: 'Values',  multi: true,  hint: 'Cell values', required: true },
    ]
  },
  card: {
    label: 'Card', category: 'tabular', implemented: true,
    buckets: [
      { id: 'fields', label: 'Fields', multi: true, hint: 'Drag a measure here', required: true },
    ]
  },
  // ── Other ─────────────────────────────────────────────────────────────────
  map: {
    label: 'Map', category: 'other', implemented: false,
    buckets: [
      { id: 'location', label: 'Location', multi: false, hint: 'Geographic field', required: true },
      { id: 'size',     label: 'Size',     multi: false, hint: 'Bubble size', required: false },
    ]
  },
  wordCloud: {
    label: 'Word Cloud', category: 'other', implemented: false,
    buckets: [
      { id: 'category', label: 'Category', multi: false, hint: 'Word source', required: true },
      { id: 'values',   label: 'Values',   multi: false, hint: 'Word size', required: false },
    ]
  },
  qna: {
    label: 'Q&A', category: 'other', implemented: false,
    buckets: []
  },
}

// ─── Visual State ─────────────────────────────────────────────────────────────

export interface VisualFormat {
  title: string
  showTitle: boolean
  showDataLabels: boolean
  color: string
}

export interface Visual {
  id: string
  type: VisualType
  position: { x: number; y: number }
  size: { width: number; height: number }
  fields: Record<string, AxisField[]>  // bucketId → fields
  format: VisualFormat
}

export function makeVisual(type: VisualType, x: number, y: number): Visual {
  return {
    id: `vis_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    position: { x, y },
    size: { width: 420, height: 300 },
    fields: {},
    format: {
      title: VIS_META[type].label,
      showTitle: true,
      showDataLabels: false,
      color: '#0ea5e9'
    }
  }
}

// Determine if the visual can run a query (all required buckets filled)
export function isQueryable(visual: Visual): boolean {
  return VIS_META[visual.type].buckets
    .filter((b) => b.required)
    .every((b) => (visual.fields[b.id] ?? []).length > 0)
}
