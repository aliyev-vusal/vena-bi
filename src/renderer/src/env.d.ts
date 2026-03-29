/// <reference types="vite/client" />

import type { ElectronAPI } from '@electron-toolkit/preload'

interface Field {
  name: string
  type: 'dimension' | 'measure'
  dataType: string
}

type LoadFileResult =
  | { success: true; fields: Field[]; rowCount: number; filePath: string }
  | { success: false; error: string; canceled?: boolean }

type QueryChartResult =
  | { success: true; data: { x: unknown; value: number }[] }
  | { success: false; error: string }

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFile: () => Promise<LoadFileResult>
      queryChart: (xColumn: string, yColumn: string) => Promise<QueryChartResult>
      onMenuOpenFile: (callback: () => void) => () => void
    }
  }
}
