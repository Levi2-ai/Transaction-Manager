const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // Load the local HTML file (your React app)
    const startUrl = path.join(__dirname, 'dist', 'index.html');
    win.loadFile(startUrl);

    // Open the DevTools.
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
