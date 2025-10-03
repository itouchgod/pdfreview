#!/usr/bin/env node

/**
 * 简单的PNG图标生成脚本
 * 使用Canvas API生成PDFR图标
 */

const fs = require('fs');
const path = require('path');

// 检查是否安装了canvas
let Canvas;
try {
  Canvas = require('canvas');
} catch (error) {
  console.log('❌ Canvas库未安装，请运行: npm install canvas');
  console.log('或者使用在线工具将SVG转换为PNG');
  process.exit(1);
}

// 图标尺寸配置
const iconSizes = [
  { size: 48, name: 'icon-48x48.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' }
];

// Apple Touch Icon
const appleTouchIcon = { size: 180, name: 'apple-touch-icon.png' };

// 生成PDFR图标的函数
function generatePDFRIcon(size) {
  const canvas = Canvas.createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 设置背景
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(0, 0, size, size);
  
  // 绘制圆形背景
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 2, 0, 2 * Math.PI);
  ctx.fillStyle = '#3b82f6';
  ctx.fill();
  
  // 绘制边框
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // 设置文字样式
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 绘制"PDF"文字
  ctx.font = `bold ${Math.floor(size * 0.2)}px Arial`;
  ctx.fillText('PDF', size/2, size/2 - size * 0.1);
  
  // 绘制"R"文字
  ctx.font = `bold ${Math.floor(size * 0.3)}px Arial`;
  ctx.fillText('R', size/2, size/2 + size * 0.15);
  
  // 绘制装饰点
  ctx.beginPath();
  ctx.arc(size/2, size/2 + size * 0.3, size * 0.03, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fill();
  
  return canvas.toBuffer('image/png');
}

// 生成所有图标
function generateAllIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  console.log('🎨 开始生成PDFR PNG图标...');
  
  // 生成各种尺寸的图标
  iconSizes.forEach(({ size, name }) => {
    try {
      const buffer = generatePDFRIcon(size);
      const filePath = path.join(publicDir, name);
      fs.writeFileSync(filePath, buffer);
      console.log(`✅ 生成 ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ 生成 ${name} 失败:`, error.message);
    }
  });
  
  // 生成Apple Touch Icon
  try {
    const buffer = generatePDFRIcon(appleTouchIcon.size);
    const filePath = path.join(publicDir, appleTouchIcon.name);
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ 生成 ${appleTouchIcon.name} (${appleTouchIcon.size}x${appleTouchIcon.size})`);
  } catch (error) {
    console.error(`❌ 生成 ${appleTouchIcon.name} 失败:`, error.message);
  }
  
  console.log('🎉 所有PNG图标生成完成！');
}

// 运行脚本
if (require.main === module) {
  generateAllIcons();
}

module.exports = { generateAllIcons, generatePDFRIcon };
