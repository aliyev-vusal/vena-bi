/// <reference types="vite/client" />

import type { ElectronAPI } from '@electron-toolkit/preload'

interface Field {
  name: string
  type: 'dimension' | 'measure'
  dataType: string
}

type LoadFileResult =
  | { success: true; fields: Field[]; rowCount: number; filePath: string; tableName: string }
  | { success: false; error: string; canceled?: boolean }

interface Measure {
  id: string
  name: string
  expression: string
}

interface Relationship {
  id: string
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
}

interface AxisField {
  fieldName: string
  tableName: string
  isMeasure: boolean
  measureExpression?: string
  dataType?: string
}

interface ETLStep {
  id: string
  kind: 'rename' | 'cast' | 'remove' | 'filter_not_null'
  column: string
  newName?: string
  castType?: string
}

type ModelQueryResult =
  | { success: true; data: { x: unknown; value: number }[] }
  | { success: false; error: string }

type TableDataResult =
  | { success: true; columns: { name: string; dataType: string }[]; rows: unknown[][]; total: number }
  | { success: false; error: string }

type ColumnStatsResult =
  | { success: true; stats: { name: string; dataType: string; nonNull: number; total: number; distinct: number; sample: unknown[] }[] }
  | { success: false; error: string }

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFile: () => Promise<LoadFileResult>
      dropTable: (tableName: string) => Promise<void>
      queryChart: (xField: AxisField, yField: AxisField) => Promise<ModelQueryResult>
      getMeasures: () => Promise<Measure[]>
      addMeasure: (m: Omit<Measure, 'id'>) => Promise<Measure>
      removeMeasure: (id: string) => Promise<void>
      getRelationships: () => Promise<Relationship[]>
      addRelationship: (rel: Omit<Relationship, 'id'>) => Promise<Relationship>
      removeRelationship: (id: string) => Promise<void>
      fetchTableData: (tableName: string, limit?: number) => Promise<TableDataResult>
      queryColumns: (tableName: string, columns: string[], limit?: number) => Promise<TableDataResult>
      queryAggregate: (tableName: string, fieldName: string, isMeasure: boolean, expression?: string) => Promise<{ success: true; value: number } | { success: false; error: string }>
      applyETLPreview: (tableName: string, filePath: string, steps: ETLStep[]) => Promise<TableDataResult>
      applyETLSteps: (tableName: string, filePath: string, steps: ETLStep[]) => Promise<LoadFileResult>
      getColumnStats: (tableName: string) => Promise<ColumnStatsResult>
      onMenuOpenFile: (callback: () => void) => () => void
    }
  }
}
