import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
const fs = require('fs');
const { printPdfByBase64, printHtmlByBase64 } = require('web-print-pdf');

let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(app.getAppPath(), 'dist-electron/preload/preload.js')
    }
  });
  mainWindow.webContents.openDevTools();
  console.log(1111,path.join(app.getAppPath(), 'dist-electron/preload/preload.js'))
  // 加载 Vue 应用
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
  } else {
    const filePath = path.join(app.getAppPath(), 'dist/index.html');
    console.log(22222,path.join(app.getAppPath(), 'dist/index.html'))
    mainWindow.loadFile(filePath);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ========== IPC 处理文件操作 ==========

ipcMain.handle('file:processFiles', async (event, filePaths) => {
  const results = [];
  const totalCount = filePaths.length;

  for (let i = 0; i < totalCount; i++) {
    const filePath = filePaths[i];
    let base64Content;
    
    try {
      // 1. 异步获取文件信息，避免阻塞主进程
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);
      
      // 2. 异步读取文件并转为 Base64
      const fileBuffer = await fs.readFile(filePath);
      base64Content = fileBuffer.toString('base64');
      
      let result;
      // 3. 使用 ext 替代 req.file.mimetype 进行类型判断
      if (ext === '.pdf') {
        result = await printPdfByBase64(base64Content, {
          paperFormat: 'A4'
        }, {
          silent: true,
          printer: 'HP-LaserJet',
          copies: 1
        });
      } else if (['.html', '.htm'].includes(ext)) {
        result = await printHtmlByBase64(base64Content, {
          paperFormat: 'A4'
        }, {
          silent: true
        });
      } else {
        // 不支持的文件类型记录错误，但不中断整个批量任务
        results.push({
          path: filePath,
          name: fileName,
          status: 'error',
          error: `不支持的文件类型: ${ext}`
        });
        continue; // 跳过当前文件，继续处理下一个
      }

      // 4. 收集成功的打印结果
      results.push({
        path: filePath,
        name: fileName,
        status: 'success',
        result: result
      });

    } catch (error) {
      // 5. 捕获异常，记录失败文件
      results.push({
        path: filePath,
        name: path.basename(filePath),
        status: 'error',
        error: error.message
      });
    } finally {
      // 6. 实时向前端发送当前处理进度
      event.sender.send('print-progress', {
        current: i + 1,
        total: totalCount,
        percent: Math.floor(((i + 1) / totalCount) * 100)
      });
    }
  }

  return results;
});

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

ipcMain.handle('print:get-printers', async () => {
  try {
    // 获取当前所有窗口中的第一个（或指定主窗口）
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      return await win.webContents.getPrintersAsync();
    }
    return [];
  } catch (error) {
    console.error('获取打印机列表失败:', error);
    return [];
  }
});