#!/usr/bin/env node

/**
 * 上传PDF文件到Cloudflare Pages
 * 清空现有文件并上传新的PDF文件
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  projectName: 'impa-pdf-storage',
  pdfSourceDir: './public/pdfs/sections',
  tempDir: './temp-cloudflare-upload',
  accountId: '3bdbf85a2f2a120ab9724fdc625749f2'
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  try {
    log(`🔄 ${description}...`, 'blue');
    const result = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    log(`✅ ${description} 完成`, 'green');
    return result;
  } catch (error) {
    log(`❌ ${description} 失败: ${error.message}`, 'red');
    throw error;
  }
}

function getPDFFiles() {
  const pdfDir = path.resolve(CONFIG.pdfSourceDir);
  if (!fs.existsSync(pdfDir)) {
    throw new Error(`PDF目录不存在: ${pdfDir}`);
  }

  const files = fs.readdirSync(pdfDir)
    .filter(file => file.endsWith('.pdf'))
    .map(file => ({
      name: file,
      path: path.join(pdfDir, file),
      size: fs.statSync(path.join(pdfDir, file)).size
    }));

  log(`📁 找到 ${files.length} 个PDF文件`, 'cyan');
  files.forEach(file => {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    log(`   - ${file.name} (${sizeMB} MB)`, 'magenta');
  });

  return files;
}

function createTempDirectory() {
  const tempDir = path.resolve(CONFIG.tempDir);
  
  // 清理临时目录
  if (fs.existsSync(tempDir)) {
    log('🧹 清理临时目录...', 'yellow');
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // 创建临时目录
  fs.mkdirSync(tempDir, { recursive: true });
  log(`📁 创建临时目录: ${tempDir}`, 'green');
  
  return tempDir;
}

function copyPDFsToTemp(tempDir, pdfFiles) {
  const pdfsDir = path.join(tempDir, 'pdfs');
  fs.mkdirSync(pdfsDir, { recursive: true });

  log('📋 复制PDF文件到临时目录...', 'blue');
  pdfFiles.forEach(file => {
    const destPath = path.join(pdfsDir, file.name);
    fs.copyFileSync(file.path, destPath);
    log(`   ✅ 复制: ${file.name}`, 'green');
  });

  // 复制JSON配置文件
  const jsonSource = path.join(CONFIG.pdfSourceDir, 'accurate-split-info.json');
  if (fs.existsSync(jsonSource)) {
    const jsonDest = path.join(pdfsDir, 'accurate-split-info.json');
    fs.copyFileSync(jsonSource, jsonDest);
    log('   ✅ 复制: accurate-split-info.json', 'green');
  }
}

function createIndexHTML(tempDir) {
  const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IMPA PDF Storage</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2563eb;
            text-align: center;
            margin-bottom: 30px;
        }
        .file-list {
            list-style: none;
            padding: 0;
        }
        .file-item {
            padding: 10px;
            margin: 5px 0;
            background: #f8fafc;
            border-radius: 5px;
            border-left: 4px solid #2563eb;
        }
        .file-name {
            font-weight: 600;
            color: #1e40af;
        }
        .file-size {
            color: #64748b;
            font-size: 0.9em;
        }
        .stats {
            background: #e0f2fe;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 IMPA Marine Stores Guide PDF Storage</h1>
        <div class="stats">
            <strong>总文件数:</strong> ${getPDFFiles().length} 个PDF文件<br>
            <strong>更新时间:</strong> ${new Date().toLocaleString('zh-CN')}
        </div>
        <h2>📄 可用文件列表</h2>
        <ul class="file-list">
            ${getPDFFiles().map(file => `
                <li class="file-item">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </li>
            `).join('')}
        </ul>
        <p style="text-align: center; color: #64748b; margin-top: 30px;">
            🚀 由 Cloudflare Pages 托管
        </p>
    </div>
</body>
</html>`;

  fs.writeFileSync(path.join(tempDir, 'index.html'), indexContent);
  log('📄 创建 index.html', 'green');
}

function deployToCloudflare(tempDir) {
  log('🚀 开始部署到 Cloudflare Pages...', 'blue');
  
  try {
    // 使用 wrangler pages deploy 命令
    const deployCommand = `wrangler pages deploy "${tempDir}" --project-name="${CONFIG.projectName}" --compatibility-date=2024-12-19`;
    
    log(`执行命令: ${deployCommand}`, 'cyan');
    const result = execSync(deployCommand, { 
      encoding: 'utf8',
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    log('🎉 部署成功！', 'green');
    return result;
  } catch (error) {
    log(`❌ 部署失败: ${error.message}`, 'red');
    throw error;
  }
}

function cleanup(tempDir) {
  if (fs.existsSync(tempDir)) {
    log('🧹 清理临时文件...', 'yellow');
    fs.rmSync(tempDir, { recursive: true, force: true });
    log('✅ 清理完成', 'green');
  }
}

async function main() {
  try {
    log('🚀 开始上传PDF文件到Cloudflare Pages', 'bright');
    log('=' * 50, 'cyan');

    // 1. 获取PDF文件列表
    const pdfFiles = getPDFFiles();
    if (pdfFiles.length === 0) {
      throw new Error('没有找到PDF文件');
    }

    // 2. 创建临时目录
    const tempDir = createTempDirectory();

    // 3. 复制PDF文件
    copyPDFsToTemp(tempDir, pdfFiles);

    // 4. 创建索引页面
    createIndexHTML(tempDir);

    // 5. 部署到Cloudflare
    deployToCloudflare(tempDir);

    // 6. 清理临时文件
    cleanup(tempDir);

    log('=' * 50, 'cyan');
    log('🎉 所有操作完成！', 'bright');
    log(`📱 访问地址: https://${CONFIG.projectName}.pages.dev`, 'green');
    log(`🔗 自定义域名: https://ceb894f3.${CONFIG.projectName}.pages.dev`, 'green');

  } catch (error) {
    log(`❌ 操作失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { main, getPDFFiles };
