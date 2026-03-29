import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { LoadFileResult, QueryChartResult } from '../main/dataService'

const api = {
  openFile: (): Promise<LoadFileResult> => ipcRenderer.invoke('open-file'),
  queryChart: (xColumn: string, yColumn: string): Promise<QueryChartResult> =>
    ipcRenderer.invoke('query-chart', xColumn, yColumn),
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
