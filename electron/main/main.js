// ✅ 全部用 require，不要用 import
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const pdf_table_extractor = require('pdf-table-extractor');

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

// 将 pdf-table-extractor 包装为 Promise
function extractTables(pdfPath) {
  return new Promise((resolve, reject) => {
    pdf_table_extractor(pdfPath, resolve, reject);
  });
}
// 方式二：接收前端传来的文件路径，进行业务处理
ipcMain.handle('file:processFiles', async (event, filePaths) => {
const results = [];
  
  for (const filePath of filePaths) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);
      const stats = fs.statSync(filePath);
      
      // 只处理 PDF 文件
      if (ext !== '.pdf') {
        results.push({
          path: filePath,
          name: fileName,
          size: stats.size,
          status: 'skipped',
          reason: '不是 PDF 文件'
        });
        continue;
      }
      
      // 提取 PDF 表格数据
      const tableData = await extractTables(filePath);
      
      // 整理表格数据
      const pages = tableData.pageTables.map(page => ({
        pageNumber: page.page,
        tables: page.tables  // 二维数组
      }));
      
      results.push({
        path: filePath,
        name: fileName,
        size: stats.size,
        pageCount: tableData.numPages,
        pages: pages,
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