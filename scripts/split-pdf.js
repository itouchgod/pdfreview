const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

// PDF分割配置
const SPLIT_CONFIG = {
  // 按章节分割的配置
  sections: [
    {
      name: '01-目录和前言',
      startPage: 1,
      endPage: 50,
      description: '目录、前言、使用说明'
    },
    {
      name: '02-船舶设备',
      startPage: 51,
      endPage: 200,
      description: '船舶基本设备和系统'
    },
    {
      name: '03-机械部件',
      startPage: 201,
      endPage: 400,
      description: '发动机、泵、阀门等机械部件'
    },
    {
      name: '04-电气设备',
      startPage: 401,
      endPage: 600,
      description: '电气系统、仪表、控制设备'
    },
    {
      name: '05-安全设备',
      startPage: 601,
      endPage: 800,
      description: '消防、救生、安全设备'
    },
    {
      name: '06-导航设备',
      startPage: 801,
      endPage: 1000,
      description: '导航、通信、雷达设备'
    },
    {
      name: '07-甲板设备',
      startPage: 1001,
      endPage: 1200,
      description: '锚、缆绳、甲板机械'
    },
    {
      name: '08-厨房设备',
      startPage: 1201,
      endPage: 1400,
      description: '厨房、餐厅、生活设备'
    },
    {
      name: '09-工具和备件',
      startPage: 1401,
      endPage: 1600,
      description: '工具、备件、维护用品'
    },
    {
      name: '10-附录和索引',
      startPage: 1601,
      endPage: -1, // -1 表示到最后一页
      description: '附录、索引、参考信息'
    }
  ],
  
  // 输出目录
  outputDir: './public/pdfs/sections/',
  
  // 最大文件大小 (MB)
  maxFileSize: 50
};

async function getPDFInfo(pdfPath) {
  try {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    return {
      pageCount: pdfDoc.getPageCount(),
      fileSize: fs.statSync(pdfPath).size
    };
  } catch (error) {
    console.error('读取PDF文件失败:', error);
    return null;
  }
}

async function splitPDF(pdfPath, outputDir) {
  try {
    console.log('开始分割PDF文件...');
    
    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 读取PDF文件
    const pdfBytes = fs.readFileSync(pdfPath);
    const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();
    
    console.log(`PDF总页数: ${totalPages}`);
    console.log(`文件大小: ${(fs.statSync(pdfPath).size / 1024 / 1024).toFixed(1)}MB`);
    
    // 分割PDF
    for (const section of SPLIT_CONFIG.sections) {
      const endPage = section.endPage === -1 ? totalPages : Math.min(section.endPage, totalPages);
      
      if (section.startPage > totalPages) {
        console.log(`跳过 ${section.name}: 起始页超出范围`);
        continue;
      }
      
      console.log(`正在处理: ${section.name} (第${section.startPage}-${endPage}页)`);
      
      // 创建新的PDF文档
      const newPdf = await PDFDocument.create();
      
      // 复制页面
      const pages = await newPdf.copyPages(sourcePdf, 
        Array.from({ length: endPage - section.startPage + 1 }, (_, i) => section.startPage - 1 + i)
      );
      
      pages.forEach(page => newPdf.addPage(page));
      
      // 保存分割后的PDF
      const pdfBytes = await newPdf.save();
      const outputPath = path.join(outputDir, `${section.name}.pdf`);
      fs.writeFileSync(outputPath, pdfBytes);
      
      const fileSize = (pdfBytes.length / 1024 / 1024).toFixed(1);
      console.log(`  ✅ 已保存: ${outputPath} (${fileSize}MB)`);
      
      // 检查文件大小
      if (pdfBytes.length > SPLIT_CONFIG.maxFileSize * 1024 * 1024) {
        console.log(`  ⚠️  警告: 文件大小超过${SPLIT_CONFIG.maxFileSize}MB，建议进一步分割`);
      }
    }
    
    console.log('\nPDF分割完成！');
    
    // 生成分割信息文件
    const splitInfo = {
      originalFile: path.basename(pdfPath),
      originalSize: fs.statSync(pdfPath).size,
      totalPages: totalPages,
      sections: SPLIT_CONFIG.sections.map(section => ({
        name: section.name,
        description: section.description,
        startPage: section.startPage,
        endPage: section.endPage === -1 ? totalPages : section.endPage,
        filePath: `sections/${section.name}.pdf`
      })),
      splitDate: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'split-info.json'), 
      JSON.stringify(splitInfo, null, 2)
    );
    
    console.log('分割信息已保存到: split-info.json');
    
  } catch (error) {
    console.error('分割PDF失败:', error);
  }
}

async function main() {
  const pdfPath = './public/pdfs/impa_8th_2023.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF文件不存在:', pdfPath);
    return;
  }
  
  // 获取PDF信息
  const info = await getPDFInfo(pdfPath);
  if (!info) return;
  
  console.log('PDF文件信息:');
  console.log(`  页数: ${info.pageCount}`);
  console.log(`  大小: ${(info.fileSize / 1024 / 1024).toFixed(1)}MB`);
  console.log('');
  
  // 分割PDF
  await splitPDF(pdfPath, SPLIT_CONFIG.outputDir);
}

// 运行脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { splitPDF, getPDFInfo, SPLIT_CONFIG };
