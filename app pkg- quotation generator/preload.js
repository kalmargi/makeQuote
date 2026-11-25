// Exposes only refocus(), printers() and print(options) to the page.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  refocus: () => ipcRenderer.invoke('refocus'),
  printers: () => ipcRenderer.invoke('printers'),
  print: (options) => ipcRenderer.invoke('print', options)
});
