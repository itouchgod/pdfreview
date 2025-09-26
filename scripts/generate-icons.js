#!/usr/bin/env node

/**
 * 图标生成脚本
 * 将SVG图标转换为不同尺寸的PNG文件
 * 
 * 使用方法：
 * 1. 安装依赖：npm install sharp
 * 2. 运行脚本：node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// 检查是否安装了sharp
try {
  require('sharp');
} catch (error) {
  console.error('❌ 请先安装sharp依赖：');
  console.error('npm install sharp');
  process.exit(1);
}

const sharp = require('sharp');

const svgPath = path.join(__dirname, '../public/brand-icon.svg');
const publicDir = path.join(__dirname, '../public');

// 图标配置
const iconSizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 48, name: 'icon-48x48.png' }
];

async function generateIcons() {
  try {
    console.log('🚀 开始生成图标...');
    
    // 读取SVG文件
    const svgBuffer = fs.readFileSync(svgPath);
    
    for (const icon of iconSizes) {
      const outputPath = path.join(publicDir, icon.name);
      
      await sharp(svgBuffer)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ 生成 ${icon.name} (${icon.size}x${icon.size})`);
    }
    
    console.log('🎉 所有图标生成完成！');
    console.log('\n📱 现在您的应用支持：');
    console.log('- iPhone添加到主屏幕');
    console.log('- Android PWA安装');
    console.log('- 各种设备图标显示');
    
  } catch (error) {
    console.error('❌ 生成图标时出错：', error.message);
    process.exit(1);
  }
}

generateIcons();
