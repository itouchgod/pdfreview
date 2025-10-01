// 部署配置 - 香港东部区域
module.exports = {
  // 部署区域信息
  region: 'ap-east-1',
  zone: 'hkg1',
  location: 'Hong Kong (East)',
  
  // Vercel 配置
  vercel: {
    regions: ['hkg1'],
    functions: {
      'src/app/**/*.tsx': {
        regions: ['hkg1']
      }
    }
  },
  
  // AWS 配置（如果使用 AWS）
  aws: {
    region: 'ap-east-1',
    availabilityZone: 'ap-east-1a'
  },
  
  // 构建配置
  build: {
    env: {
      NEXT_PUBLIC_REGION: 'ap-east-1',
      NEXT_PUBLIC_ZONE: 'hkg1',
      NEXT_PUBLIC_LOCATION: 'Hong Kong (East)'
    }
  }
};
