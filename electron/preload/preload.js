const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给 Vue 前端
contextBridge.exposeInMainWorld('electronAPI', {
  // 处理文件（传入路径数组）
  processFiles: (filePaths) => ipcRenderer.invoke('file:processFiles', filePaths),
  
  // 复制文件到指定目录
  copyFiles: (filePaths, targetDir) => ipcRenderer.invoke('file:copyFiles', { filePaths, targetDir }),
  
  // 监听进度（如果需要）
  onProgress: (callback) => ipcRenderer.on('file:progress', callback),
  getPrinters: () => ipcRenderer.invoke('print:get-printers'),
  onPrintProgress: (callback) => {
    ipcRenderer.on('print-progress', callback);
  }
});