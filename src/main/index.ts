import { app, shell, BrowserWindow, Menu, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { dataService } from './dataService'
import type { ETLStep } from './dataService'
import { ModelManager } from './modelManager'
import type { Relationship, Measure, AxisField } from './modelManager'

const modelManager = new ModelManager(dataService.conn)

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#1e1e1e',
    vibrancy: 'sidebar',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function buildMacOSMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: 'About VENA BI' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open CSV / Parquet…',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu-open-file')
          }
        },
        { type: 'separator' },
        { role: 'close', label: 'Close' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'toggleDevTools', label: 'Developer Tools' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Full Screen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'zoom', label: 'Zoom' },
        { type: 'separator' },
        { role: 'front', label: 'Bring All to Front' }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function registerIpcHandlers(): void {
  // ── File loading ──────────────────────────────────────────────────────────
  ipcMain.handle('open-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Open Data File',
      properties: ['openFile'],
      filters: [{ name: 'Data Files', extensions: ['csv', 'parquet'] }]
    })
    if (canceled || filePaths.length === 0) return { success: false, canceled: true }
    return dataService.loadFile(filePaths[0])
  })

  ipcMain.handle('drop-table', (_event, tableName: string) => {
    dataService.dropTable(tableName)
  })

  ipcMain.handle('apply-etl-preview', (_event, tableName: string, filePath: string, steps: ETLStep[]) =>
    dataService.applyETLPreview(tableName, filePath, steps)
  )

  ipcMain.handle('apply-etl-steps', (_event, tableName: string, filePath: string, steps: ETLStep[]) =>
    dataService.applyETLSteps(tableName, filePath, steps)
  )

  ipcMain.handle('get-column-stats', (_event, tableName: string) =>
    dataService.getColumnStats(tableName)
  )

  ipcMain.handle('fetch-table-data', (_event, tableName: string, limit?: number) =>
    dataService.fetchTableData(tableName, limit)
  )

  ipcMain.handle('query-columns', (_event, tableName: string, columns: string[], limit?: number) =>
    dataService.queryColumns(tableName, columns, limit)
  )

  ipcMain.handle('query-aggregate', (_event, tableName: string, fieldName: string, isMeasure: boolean, expression?: string) =>
    dataService.queryAggregate(tableName, fieldName, isMeasure, expression)
  )

  // ── Query (Semantic Layer) ────────────────────────────────────────────────
  ipcMain.handle('query-chart', async (_event, xField: AxisField, yField: AxisField) => {
    return modelManager.executeQuery(xField, yField)
  })

  // ── Measures ──────────────────────────────────────────────────────────────
  ipcMain.handle('get-measures', () => modelManager.getMeasures())

  ipcMain.handle('add-measure', (_event, m: Omit<Measure, 'id'>) => modelManager.addMeasure(m))

  ipcMain.handle('remove-measure', (_event, id: string) => modelManager.removeMeasure(id))

  // ── Relationships ─────────────────────────────────────────────────────────
  ipcMain.handle('get-relationships', () => modelManager.getRelationships())

  ipcMain.handle('add-relationship', (_event, rel: Omit<Relationship, 'id'>) =>
    modelManager.addRelationship(rel)
  )

  ipcMain.handle('remove-relationship', (_event, id: string) =>
    modelManager.removeRelationship(id)
  )
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.vena-bi')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  registerIpcHandlers()
  buildMacOSMenu()
  createWindow()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
