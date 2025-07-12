const { app, Tray, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let tray = null;
let serverProcess = null;

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Exit',
      click: () => {
        if (serverProcess) {
          serverProcess.kill();
        }
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Servidor de impresión PDF');
  tray.setContextMenu(contextMenu);
}

function startServer() {
  const serverPath = path.join(__dirname, 'pdf-server.js');
  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: __dirname,
    detached: true,
    stdio: 'ignore'
  });
  serverProcess.unref();
}

app.whenReady().then(() => {
  createTray();
  startServer();
});
