const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const Database = require('./db')

let mainWindow
let db

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    frame: true,
    backgroundColor: '#faf6f0',
    title: 'TravelMemory · 旅行记忆',
    icon: path.join(__dirname, '../public/favicon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })

  if (!app.isPackaged && process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5188')
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = app.isPackaged
      ? path.join(__dirname, '../dist/index.html')
      : path.join(__dirname, '../../dist/index.html')
    mainWindow.loadFile(indexPath)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData')
  const dataDir = path.join(userDataPath, 'travel-memory-data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  const mediaDir = path.join(dataDir, 'media')
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true })
  }

  db = new Database(path.join(dataDir, 'travel-memory.db'))
  db.init()

  global.dataDir = dataDir
  global.mediaDir = mediaDir
  global.db = db

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '媒体文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'mp4', 'mov', 'avi', 'mkv', 'heic'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  return result
})

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  return result
})

ipcMain.handle('save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options || {})
  return result
})

ipcMain.handle('copy-file', async (event, src, dest) => {
  return new Promise((resolve, reject) => {
    fs.copyFile(src, dest, (err) => {
      if (err) reject(err)
      else resolve(dest)
    })
  })
})

ipcMain.handle('read-file', async (event, filePath) => {
  return fs.readFileSync(filePath)
})

ipcMain.handle('file-exists', async (event, filePath) => {
  return fs.existsSync(filePath)
})

ipcMain.handle('stat-file', async (event, filePath) => {
  return fs.statSync(filePath)
})

ipcMain.handle('write-file', async (event, filePath, data) => {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (typeof data === 'string') {
    fs.writeFileSync(filePath, data)
  } else {
    fs.writeFileSync(filePath, Buffer.from(data))
  }
  return true
})

ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url)
})

ipcMain.handle('show-item-in-folder', async (event, filePath) => {
  shell.showItemInFolder(filePath)
})

ipcMain.handle('get-paths', () => {
  return {
    userData: app.getPath('userData'),
    dataDir: global.dataDir,
    mediaDir: global.mediaDir
  }
})

const dbHandlers = {
  'db:all': (event, sql, params) => db.all(sql, params),
  'db:get': (event, sql, params) => db.get(sql, params),
  'db:run': (event, sql, params) => db.run(sql, params),
  'db:insert': (event, table, data) => db.insert(table, data),
  'db:update': (event, table, data, where) => db.update(table, data, where),
  'db:delete': (event, table, where) => db.delete(table, where),
  'travel:list': () => db.getTravels(),
  'travel:get': (event, id) => db.getTravel(id),
  'travel:create': (event, data) => db.createTravel(data),
  'travel:update': (event, id, data) => db.updateTravel(id, data),
  'travel:delete': (event, id) => db.deleteTravel(id),
  'album:list': () => db.getAlbums(),
  'album:get': (event, id) => db.getAlbum(id),
  'album:create': (event, data) => db.createAlbum(data),
  'album:update': (event, id, data) => db.updateAlbum(id, data),
  'album:delete': (event, id) => db.deleteAlbum(id),
  'media:list': (event, filters) => db.getMediaList(filters),
  'media:get': (event, id) => db.getMedia(id),
  'media:create': (event, data) => db.createMedia(data),
  'media:update': (event, id, data) => db.updateMedia(id, data),
  'media:delete': (event, id) => db.deleteMedia(id),
  'media:bulk-create': (event, items) => db.bulkCreateMedia(items),
  'media:bulk-update': (event, ids, data) => db.bulkUpdateMedia(ids, data),
  'media:add-to-album': (event, mediaId, albumId) => db.addMediaToAlbum(mediaId, albumId),
  'media:remove-from-album': (event, mediaId, albumId) => db.removeMediaFromAlbum(mediaId, albumId),
  'media:get-by-album': (event, albumId) => db.getMediaByAlbum(albumId),
  'media:get-by-travel': (event, travelId) => db.getMediaByTravel(travelId),
  'expense:list': (event, travelId) => db.getExpenses(travelId),
  'expense:create': (event, data) => db.createExpense(data),
  'expense:update': (event, id, data) => db.updateExpense(id, data),
  'expense:delete': (event, id) => db.deleteExpense(id),
  'expense:summary': (event, travelId) => db.getExpenseSummary(travelId),
  'itinerary:list': (event, travelId) => db.getItinerary(travelId),
  'itinerary:create': (event, data) => db.createItineraryItem(data),
  'itinerary:update': (event, id, data) => db.updateItineraryItem(id, data),
  'itinerary:delete': (event, id) => db.deleteItineraryItem(id),
  'tags:list': () => db.getAllTags(),
  'stats:overview': () => db.getOverviewStats(),
  'stats:timeline': (event, year) => db.getTimelineData(year),
  'stats:map': () => db.getMapData(),
  'photobook:list': () => db.getPhotoBooks(),
  'photobook:get': (event, id) => db.getPhotoBook(id),
  'photobook:create': (event, data) => db.createPhotoBook(data),
  'photobook:update': (event, id, data) => db.updatePhotoBook(id, data),
  'photobook:delete': (event, id) => db.deletePhotoBook(id),
  'photobook:pages': (event, bookId) => db.getPhotoBookPages(bookId),
  'photobook:page-create': (event, data) => db.createPhotoBookPage(data),
  'photobook:page-update': (event, id, data) => db.updatePhotoBookPage(id, data),
  'photobook:page-delete': (event, id) => db.deletePhotoBookPage(id),
  'photobook:elements': (event, pageId) => db.getPageElements(pageId),
  'photobook:element-create': (event, data) => db.createPageElement(data),
  'photobook:element-update': (event, id, data) => db.updatePageElement(id, data),
  'photobook:element-delete': (event, id) => db.deletePageElement(id),
  'photobook:full': (event, id) => db.getPhotoBookFullData(id)
}

for (const [channel, handler] of Object.entries(dbHandlers)) {
  ipcMain.handle(channel, handler)
}
