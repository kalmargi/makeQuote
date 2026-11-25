// Electron main process: window, single instance, printing.
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let win = null;
const PX_TO_MICRONS = 264.583; // 25400 microns per inch / 96 px per inch

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    win = new BrowserWindow({
      show: false,
      title: 'Quotation Maker',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        devTools: false
      }
    });
    win.maximize();
    win.once('ready-to-show', () => win.show());
    win.loadFile(path.join(__dirname, 'qmaker.html'));
    win.on('closed', () => { win = null; });
  });

  app.on('window-all-closed', () => app.quit());

  // Fixes frozen text inputs after native dialogs
  ipcMain.handle('refocus', () => {
    if (win) { win.blur(); win.focus(); }
    return true;
  });

  ipcMain.handle('printers', async () => {
    if (!win) return [];
    const list = await win.webContents.getPrintersAsync();
    return list.map(p => ({ name: p.name, isDefault: !!p.isDefault }));
  });

  // o = {html, printer, paper, thermal, landscape, scale, copies, silent}
  ipcMain.handle('print', (e, o) => new Promise(async (resolve) => {
    let pw = null;
    try {
      const mm = o.paper === 'T58' ? 58 : 80;
      const widthPx = Math.round(mm / 25.4 * 96);
      pw = new BrowserWindow({
        show: false,
        useContentSize: true,
        width: o.thermal ? widthPx : 1000,
        height: 1000,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
      });
      await pw.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(o.html));
      let pageSize = o.paper;
      if (o.thermal) {
        const h = await pw.webContents.executeJavaScript('document.body.scrollHeight');
        pageSize = {
          width: Math.round(widthPx * PX_TO_MICRONS),
          height: Math.round((h + 6) * PX_TO_MICRONS)
        };
      }
      pw.webContents.print({
        silent: !!o.silent,
        printBackground: true,
        deviceName: o.printer || '',
        copies: Math.max(1, o.copies || 1),
        scaleFactor: o.scale || 100,
        landscape: !!o.landscape,
        margins: { marginType: 'none' },
        pageSize
      }, (ok, err) => {
        if (pw && !pw.isDestroyed()) pw.destroy();
        resolve({ ok: !!ok, err: err || '' });
      });
    } catch (err) {
      if (pw && !pw.isDestroyed()) pw.destroy();
      resolve({ ok: false, err: String(err) });
    }
  }));
}
