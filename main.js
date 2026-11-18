// غلاف سطح المكتب (Electron) — يشغّل نفس تطبيق الويب الموجود في مجلد app/ بدون إنترنت
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1360, height: 880, minWidth: 900, minHeight: 600,
    title: 'انتقاء الحركية قصيرة المدى',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // فتح الروابط الخارجية في المتصفح الافتراضي
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); } });
}

const menu = Menu.buildFromTemplate([
  { label: 'ملف', submenu: [{ role: 'reload', label: 'إعادة التحميل' }, { type: 'separator' }, { role: 'quit', label: 'خروج' }] },
  { label: 'تحرير', submenu: [{ role: 'undo', label: 'تراجع' }, { role: 'redo', label: 'إعادة' }, { type: 'separator' }, { role: 'cut', label: 'قص' }, { role: 'copy', label: 'نسخ' }, { role: 'paste', label: 'لصق' }, { role: 'selectAll', label: 'تحديد الكل' }] },
  { label: 'عرض', submenu: [{ role: 'zoomIn', label: 'تكبير' }, { role: 'zoomOut', label: 'تصغير' }, { role: 'resetZoom', label: 'الحجم الأصلي' }, { role: 'togglefullscreen', label: 'ملء الشاشة' }] }
]);

app.whenReady().then(() => {
  Menu.setApplicationMenu(menu);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
