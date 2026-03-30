import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { LoadFileResult, TableDataResult, ETLStep, ColumnStatsResult } from '../main/dataService'
import type { Measure, Relationship, AxisField, ModelQueryResult } from '../main/modelManager'

const api = {
  // File
  openFile: (): Promise<LoadFileResult> => ipcRenderer.invoke('open-file'),
  dropTable: (tableName: string): Promise<void> => ipcRenderer.invoke('drop-table', tableName),
  fetchTableData: (tableName: string, limit?: number): Promise<TableDataResult> =>
    ipcRenderer.invoke('fetch-table-data', tableName, limit),
  queryColumns: (tableName: string, columns: string[], limit?: number): Promise<TableDataResult> =>
    ipcRenderer.invoke('query-columns', tableName, columns, limit),
  queryAggregate: (tableName: string, fieldName: string, isMeasure: boolean, expression?: string): Promise<{ success: true; value: number } | { success: false; error: string }> =>
    ipcRenderer.invoke('query-aggregate', tableName, fieldName, isMeasure, expression),

  // ETL / Power Query
  applyETLPreview: (tableName: string, filePath: string, steps: ETLStep[]): Promise<TableDataResult> =>
    ipcRenderer.invoke('apply-etl-preview', tableName, filePath, steps),
  applyETLSteps: (tableName: string, filePath: string, steps: ETLStep[]): Promise<LoadFileResult> =>
    ipcRenderer.invoke('apply-etl-steps', tableName, filePath, steps),
  getColumnStats: (tableName: string): Promise<ColumnStatsResult> =>
    ipcRenderer.invoke('get-column-stats', tableName),

  // Query (Semantic Layer)
  queryChart: (xField: AxisField, yField: AxisField): Promise<ModelQueryResult> =>
    ipcRenderer.invoke('query-chart', xField, yField),

  // Measures
  getMeasures: (): Promise<Measure[]> => ipcRenderer.invoke('get-measures'),
  addMeasure: (m: Omit<Measure, 'id'>): Promise<Measure> => ipcRenderer.invoke('add-measure', m),
  removeMeasure: (id: string): Promise<void> => ipcRenderer.invoke('remove-measure', id),

  // Relationships
  getRelationships: (): Promise<Relationship[]> => ipcRenderer.invoke('get-relationships'),
  addRelationship: (rel: Omit<Relationship, 'id'>): Promise<Relationship> =>
    ipcRenderer.invoke('add-relationship', rel),
  removeRelationship: (id: string): Promise<void> => ipcRenderer.invoke('remove-relationship', id),

  // Native menu
  onMenuOpenFile: (callback: () => void): (() => void) => {
    ipcRenderer.on('menu-open-file', callback)
    return () => ipcRenderer.removeListener('menu-open-file', callback)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
