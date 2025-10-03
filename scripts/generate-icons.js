#!/usr/bin/env node

/**
 * 图标生成脚本 - 为PDFR平台生成各种尺寸的图标
 */

const fs = require('fs');
const path = require('path');

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

// SVG模板 - 基于PDFR的设计
const svgTemplate = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景渐变圆形 -->
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- 主背景圆形 -->
  <circle cx="16" cy="16" r="15" fill="url(#bgGradient)" stroke="#1e40af" stroke-width="1"/>
  
  <!-- 内部装饰圆 -->
  <circle cx="16" cy="16" r="12" fill="none" stroke="white" stroke-width="0.5" opacity="0.2"/>
  
  <!-- PDF文字 -->
  <text x="16" y="11" font-family="Arial, sans-serif" font-size="7" font-weight="900" text-anchor="middle" fill="url(#textGradient)" letter-spacing="-0.5px">PDF</text>
  
  <!-- R字母 - 更大更突出 -->
  <text x="16" y="24" font-family="Arial, sans-serif" font-size="12" font-weight="900" text-anchor="middle" fill="url(#textGradient)">R</text>
  
  <!-- 底部装饰点 -->
  <circle cx="16" cy="28" r="1" fill="white" opacity="0.6"/>
</svg>`;

// 生成图标的函数
function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  console.log('🎨 开始生成PDFR图标...');
  
  // 生成各种尺寸的图标
  iconSizes.forEach(({ size, name }) => {
    const svgContent = svgTemplate(size);
    const svgPath = path.join(publicDir, name.replace('.png', '.svg'));
    
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✅ 生成 ${name.replace('.png', '.svg')} (${size}x${size})`);
  });
  
  // 生成Apple Touch Icon
  const appleSvgContent = svgTemplate(appleTouchIcon.size);
  const appleSvgPath = path.join(publicDir, appleTouchIcon.name.replace('.png', '.svg'));
  fs.writeFileSync(appleSvgPath, appleSvgContent);
  console.log(`✅ 生成 ${appleTouchIcon.name.replace('.png', '.svg')} (${appleTouchIcon.size}x${appleTouchIcon.size})`);
  
  console.log('🎉 所有图标生成完成！');
  console.log('');
  console.log('📝 注意：');
  console.log('- 生成的SVG文件需要手动转换为PNG格式');
  console.log('- 可以使用在线工具或ImageMagick进行转换');
  console.log('- 或者使用设计软件如Figma、Sketch等');
  console.log('');
  console.log('🔧 使用ImageMagick转换示例：');
  iconSizes.forEach(({ size, name }) => {
    console.log(`convert ${name.replace('.png', '.svg')} -resize ${size}x${size} ${name}`);
  });
  console.log(`convert ${appleTouchIcon.name.replace('.png', '.svg')} -resize ${appleTouchIcon.size}x${appleTouchIcon.size} ${appleTouchIcon.name}`);
}

// 运行脚本
if (require.main === module) {
  generateIcons();
}

module.exports = { generateIcons, svgTemplate };
