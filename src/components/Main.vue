<<template>
  <div class="file-uploader">
    <h2>文件上传</h2>
    
    <!-- 方式二：使用原生 input 选择（拖拽也可） -->
    <div class="section">
      <h3>方式二：拖拽/点击选择</h3>
      <div 
        class="drop-zone"
        @click="$refs.fileInput.click()"
        @drop.prevent="handleDrop"
        @dragover.prevent
        @dragenter.prevent
      >
        <input 
          ref="fileInput"
          type="file" 
          multiple 
          style="display: none"
          @change="handleFileChange"
        />
        <p>点击选择或拖拽文件到此处</p>
      </div>
    </div>
    
    <!-- 文件列表 -->
    <div class="file-list" v-if="selectedFiles.length > 0">
      <h3>已选择 {{ selectedFiles.length }} 个文件</h3>
      <table>
        <thead>
          <tr>
            <th>文件名</th>
            <th>大小</th>
            <th>路径</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(file, index) in selectedFiles" :key="index">
            <td>{{ file.name }}</td>
            <td>{{ file.sizeFormatted || formatBytes(file.size) }}</td>
            <td class="path" :title="file.path">{{ file.path }}</td>
            <td>
              <button @click="removeFile(index)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="actions">
        <button @click="handleProcessFiles" :disabled="processing">
          {{ processing ? '处理中...' : '处理文件' }}
        </button>
        <button @click="handleCopyFiles" :disabled="processing">
          复制到指定目录
        </button>
        <button @click="clearAll">清空</button>
      </div>
    </div>
    
    <!-- 处理结果 -->
    <div class="results" v-if="processResults.length > 0">
      <h3>处理结果</h3>
      <div v-for="(result, index) in processResults" :key="index" 
           :class="['result-item', result.status]">
        <span class="name">{{ result.name || result.source }}</span>
        <span class="status">{{ result.status }}</span>
        <span v-if="result.md5" class="md5">MD5: {{ result.md5 }}</span>
        <span v-if="result.error" class="error">{{ result.error }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const fileInput = ref(null);
const selectedFiles = ref([]);
const processResults = ref([]);
const loading = ref(false);
const processing = ref(false);


// 方式二：通过 input 选择
function handleFileChange(event) {
  const files = Array.from(event.target.files);
  // 原生 File 对象只有 path 属性（Electron 中）
  const fileInfos = files.map(file => ({
    path: file.path,  // Electron 中 File 对象有 path 属性
    name: file.name,
    size: file.size,
    sizeFormatted: formatBytes(file.size)
  }));
  selectedFiles.value = [...selectedFiles.value, ...fileInfos];
  event.target.value = ''; // 清空 input，允许重复选择
}

// 拖拽文件
function handleDrop(event) {
  const files = Array.from(event.dataTransfer.files);
  const fileInfos = files.map(file => ({
    path: file.path,
    name: file.name,
    size: file.size,
    sizeFormatted: formatBytes(file.size)
  }));
  selectedFiles.value = [...selectedFiles.value, ...fileInfos];
}

// 删除单个文件
function removeFile(index) {
  selectedFiles.value.splice(index, 1);
}

// 清空所有
function clearAll() {
  selectedFiles.value = [];
  processResults.value = [];
}

// 处理文件（传给 Node.js）
async function handleProcessFiles() {
  if (selectedFiles.value.length === 0) return;
  
  processing.value = true;
  processResults.value = [];
  
  try {
    // 只传路径数组给 Node.js
    const filePaths = selectedFiles.value.map(f => f.path);
    debugger
    const results = await window.electronAPI.processFiles(filePaths);
    debugger
    processResults.value = results;
  } catch (error) {
    alert('处理失败: ' + error.message);
  }
  
  processing.value = false;
}

// 复制文件到指定目录
async function handleCopyFiles() {
  if (selectedFiles.value.length === 0) return;
  
  const targetDir = await window.electronAPI.openFiles(); // 这里简化，实际应该选目录
  // 或者用 dialog 选择目录...
  
  processing.value = true;
  try {
    const filePaths = selectedFiles.value.map(f => f.path);
    const results = await window.electronAPI.copyFiles(filePaths, 'C:/TargetFolder');
    processResults.value = results;
  } catch (error) {
    alert('复制失败: ' + error.message);
  }
  processing.value = false;
}

// 格式化文件大小
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
</script>

<style scoped>
.file-uploader {
  padding: 20px;
}

.section {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.drop-zone:hover {
  border-color: #409eff;
}

.file-list {
  margin-top: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f5f5f5;
}

.path {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  margin-top: 15px;
}

.actions button {
  margin-right: 10px;
  padding: 8px 16px;
}

.result-item {
  padding: 10px;
  margin: 5px 0;
  border-radius: 4px;
}

.result-item.success {
  background-color: #f0f9eb;
  color: #67c23a;
}

.result-item.error {
  background-color: #fef0f0;
  color: #f56c6c;
}

.md5 {
  font-size: 12px;
  color: #666;
  margin-left: 10px;
}

.error {
  font-size: 12px;
  margin-left: 10px;
}
</style>