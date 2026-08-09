const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktopAPI", {
  saveBackup: (payload, reason) => ipcRenderer.invoke("save-backup", payload, reason),
  listBackups: () => ipcRenderer.invoke("list-backups"),
  openBackupFolder: () => ipcRenderer.invoke("open-backup-folder"),
  restoreBackup: (file) => ipcRenderer.invoke("restore-backup", file),
  onBackupRequest: (callback) => ipcRenderer.on("request-backup", (_e, reason) => callback(reason))
});
