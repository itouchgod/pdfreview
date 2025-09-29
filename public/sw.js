const CACHE_NAME = 'impa-cache-v1';
const PDF_CACHE_NAME = 'impa-pdf-cache-v1';
const STATIC_CACHE_EXPIRY = 365 * 24 * 60 * 60 * 1000; // 1年

const CACHED_ROUTES = [
  '/',
  '/home',
  '/search',
  '/manifest.json',
  '/brand-icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // 缓存基础资源
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(CACHED_ROUTES);
      }),
      // 创建 PDF 缓存
      caches.open(PDF_CACHE_NAME)
    ])
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // 清理旧版本缓存
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== PDF_CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      }),
      // 立即接管页面
      clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // PDF 文件处理
  if (url.pathname.includes('/pdfs/')) {
    event.respondWith(handlePDFRequest(event.request));
    return;
  }

  // API 请求处理
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(event.request));
    return;
  }

  // 静态资源处理
  event.respondWith(handleStaticRequest(event.request));
});

async function handlePDFRequest(request) {
  const cache = await caches.open(PDF_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // 返回缓存的响应，同时在后台更新缓存
    updatePDFCache(request, cache);
    return cachedResponse;
  }

  // 如果没有缓存，从网络获取
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // 离线时返回错误响应
    return new Response('PDF not available offline', { status: 404 });
  }
}

async function handleAPIRequest(request) {
  // API 请求优先使用网络
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // 网络错误时尝试使用缓存
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('API not available offline', { status: 503 });
  }
}

async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // 返回缓存的响应，同时在后台更新缓存
    updateStaticCache(request, cache);
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Resource not available offline', { status: 404 });
  }
}

async function updatePDFCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response);
    }
  } catch (error) {
    // 忽略更新错误
    console.error('PDF cache update failed:', error);
  }
}

async function updateStaticCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response);
    }
  } catch (error) {
    // 忽略更新错误
    console.error('Static cache update failed:', error);
  }
}
