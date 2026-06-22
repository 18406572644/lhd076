const { contextBridge, ipcRenderer } = require('electron')

const dbChannels = [
  'db:all', 'db:get', 'db:run', 'db:insert', 'db:update', 'db:delete',
  'travel:list', 'travel:get', 'travel:create', 'travel:update', 'travel:delete',
  'album:list', 'album:get', 'album:create', 'album:update', 'album:delete',
  'media:list', 'media:get', 'media:create', 'media:update', 'media:delete',
  'media:bulk-create', 'media:bulk-update',
  'media:add-to-album', 'media:remove-from-album',
  'media:get-by-album', 'media:get-by-travel',
  'expense:list', 'expense:create', 'expense:update', 'expense:delete', 'expense:summary',
  'itinerary:list', 'itinerary:create', 'itinerary:update', 'itinerary:delete',
  'tags:list', 'stats:overview', 'stats:timeline', 'stats:map'
]

const api = {
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  saveDialog: (options) => ipcRenderer.invoke('save-dialog', options),
  copyFile: (src, dest) => ipcRenderer.invoke('copy-file', src, dest),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  statFile: (filePath) => ipcRenderer.invoke('stat-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  getPaths: () => ipcRenderer.invoke('get-paths')
}

for (const channel of dbChannels) {
  const [prefix, method] = channel.split(':')
  if (!api[prefix]) api[prefix] = {}
  api[prefix][method] = (...args) => ipcRenderer.invoke(channel, ...args)
}

contextBridge.exposeInMainWorld('electronAPI', api)
