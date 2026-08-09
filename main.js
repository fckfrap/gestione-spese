const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const APP_VERSION = "7.1.0";
const BACKUP_DIR = path.join(app.getPath("userData"), "Backups");

function ensureBackupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
function pruneBackups(maxFiles = 15) {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a,b) => b.t - a.t);
  files.slice(maxFiles).forEach(x => {
    try { fs.unlinkSync(path.join(BACKUP_DIR, x.f)); } catch {}
  });
}
function saveBackup(payload, reason = "automatico") {
  ensureBackupDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(BACKUP_DIR, `backup-${stamp}-${reason}.json`);
  fs.writeFileSync(file, JSON.stringify({
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    reason,
    data: payload
  }, null, 2), "utf8");
  pruneBackups();
  return file;
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1000, minHeight: 650,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });
  win.loadFile(path.join(__dirname, "index.html"));
  setTimeout(() => win.webContents.send("request-backup", "automatico-avvio"), 1200);
}
app.whenReady().then(() => {
  ipcMain.handle("save-backup", (_e, payload, reason) => {
    try { return {ok:true,file:saveBackup(payload,reason)}; }
    catch(e) { return {ok:false,error:String(e)}; }
  });
  ipcMain.handle("list-backups", () => {
    ensureBackupDir();
    return fs.readdirSync(BACKUP_DIR).filter(f=>f.endsWith(".json"))
      .map(f => { const p=path.join(BACKUP_DIR,f), s=fs.statSync(p); return {name:f,path:p,size:s.size,modified:s.mtimeMs}; })
      .sort((a,b)=>b.modified-a.modified);
  });
  ipcMain.handle("open-backup-folder", () => { ensureBackupDir(); shell.openPath(BACKUP_DIR); return BACKUP_DIR; });
  ipcMain.handle("restore-backup", (_e, p) => {
    try { return {ok:true,payload:JSON.parse(fs.readFileSync(p,"utf8")).data}; }
    catch(e) { return {ok:false,error:String(e)}; }
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length===0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
