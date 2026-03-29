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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFile: () => Promise<LoadFileResult>
      onMenuOpenFile: (callback: () => void) => () => void
    }
  }
}
