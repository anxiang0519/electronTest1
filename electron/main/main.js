// ✅ 全部用 require，不要用 import
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
// const url = require('url');  // 如果需要 url 模块
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.webContents.openDevTools();

  // 加载 Vue 应用
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ========== IPC 处理文件操作 ==========


// 方式二：接收前端传来的文件路径，进行业务处理
ipcMain.handle('file:processFiles', async (event, filePaths) => {
  const results = [];
  
  for (const filePath of filePaths) {
    try {
      // 这里进行你的业务处理，比如：
      // - 读取文件内容
      // - 复制到指定目录
      // - 上传到其他服务器
      // - 解析文件数据
      
      const content = fs.readFileSync(filePath);
      const stats = fs.statSync(filePath);
      
      // 示例：计算文件 MD5
      const crypto = require('crypto');
      const hash = crypto.createHash('md5').update(content).digest('hex');
      
      results.push({
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        md5: hash,
        status: 'success'
      });
    } catch (error) {
      results.push({
        path: filePath,
        name: path.basename(filePath),
        error: error.message,
        status: 'error'
      });
    }
  }
  
  return results;
});

// 方式三：复制文件到指定目录
ipcMain.handle('file:copyFiles', async (event, { filePaths, targetDir }) => {
  const results = [];
  
  // 确保目标目录存在
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  for (const filePath of filePaths) {
    const fileName = path.basename(filePath);
    const targetPath = path.join(targetDir, fileName);
    
    try {
      fs.copyFileSync(filePath, targetPath);
      results.push({
        source: filePath,
        target: targetPath,
        status: 'success'
      });
    } catch (error) {
      results.push({
        source: filePath,
        error: error.message,
        status: 'error'
      });
    }
  }
  
  return results;
});

// 工具函数：格式化文件大小
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}