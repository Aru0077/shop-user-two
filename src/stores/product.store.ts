// src/stores/product.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { productService } from '@/services/product.service';
import type {
      Category,
      Product,
      ProductDetail,
      SearchProductsParams,
      HomePageData
} from '@/types/product.type';

/**
 * 商品Store - 优化版
 * 支持多商品缓存、批量加载、智能缓存管理
 */
export const useProductStore = defineStore('product', () => {
      // === 基础状态 ===
      const categories = ref<Category[]>([]);
      const homeData = ref<HomePageData | null>(null);
      const productDetailsMap = ref<Map<number, ProductDetail>>(new Map());
      const currentProductId = ref<number | null>(null);
      const searchResults = ref<Product[]>([]);
      const recentProducts = ref<ProductDetail[]>([]);

      // === 加载状态 ===
      const loading = ref<boolean>(false);
      const searchLoading = ref<boolean>(false);
      const error = ref<string | null>(null);
      const isInitialized = ref<boolean>(false);
      const isInitializing = ref<boolean>(false);
      const loadingProducts = ref<Map<number, boolean>>(new Map()); // 跟踪每个商品的加载状态

      // === 缓存控制 ===
      const MAX_CACHED_PRODUCTS = 50; // 最大缓存商品数量
      const accessTimeMap = ref<Map<number, number>>(new Map()); // 记录每个商品的最后访问时间

      // === 事件注册 ===
      let unsubscribeCategoriesChange: (() => void) | null = null;
      let unsubscribeHomeDataChange: (() => void) | null = null;
      let unsubscribeProductDetailChange: (() => void) | null = null;
      let unsubscribeRecentProductsChange: (() => void) | null = null;

      // === 计算属性 ===
      const latestProducts = computed(() => homeData.value?.latestProducts || []);
      const topSellingProducts = computed(() => homeData.value?.topSellingProducts || []);
      const currentProduct = computed<ProductDetail | null>(() => {
            if (!currentProductId.value) return null;
            return productDetailsMap.value.get(currentProductId.value) || null;
      });

      // 获取缓存中的商品数量
      const cachedProductCount = computed(() => productDetailsMap.value.size);

      // === 商品数据操作方法 ===

      /**
       * 更新商品缓存 - 内部方法
       * @param product 商品详情对象
       */
      function updateProductCache(product: ProductDetail): void {
            if (!product || !product.id) return;

            // 更新商品缓存
            productDetailsMap.value.set(product.id, product);

            // 更新访问时间
            accessTimeMap.value.set(product.id, Date.now());

            // 如果是当前查看的商品，更新当前商品ID
            if (currentProductId.value === product.id) {
                  // 只更新ID触发计算属性更新，避免不必要操作
                  currentProductId.value = product.id;
            }

            // 如果缓存超出限制，清理最旧的缓存
            if (productDetailsMap.value.size > MAX_CACHED_PRODUCTS) {
                  trimCache();
            }
      }

      /**
       * 清理缓存 - 使用LRU策略清理最近最少使用的商品
       */
      function trimCache(): void {
            if (productDetailsMap.value.size <= MAX_CACHED_PRODUCTS) return;

            // 按访问时间排序，保留较新的记录
            const sortedIds = Array.from(accessTimeMap.value.entries())
                  .sort((a, b) => a[1] - b[1]) // 按时间升序排序（旧->新）
                  .map(entry => entry[0]); // 提取ID

            // 计算需要删除的数量
            const removeCount = productDetailsMap.value.size - MAX_CACHED_PRODUCTS;

            // 删除最旧的几个商品缓存
            for (let i = 0; i < removeCount; i++) {
                  const idToRemove = sortedIds[i];

                  // 不要删除当前正在查看的商品
                  if (idToRemove === currentProductId.value) continue;

                  productDetailsMap.value.delete(idToRemove);
                  accessTimeMap.value.delete(idToRemove);
                  loadingProducts.value.delete(idToRemove);
            }
      }

      /**
       * 批量获取商品详情
       * @param ids 商品ID数组
       * @param forceRefresh 是否强制刷新
       */
      async function fetchProducts(ids: number[], forceRefresh = false): Promise<Map<number, ProductDetail>> {
            if (!ids.length) return new Map();

            const result = new Map<number, ProductDetail>();
            const needFetchIds: number[] = [];

            // 检查哪些ID需要从服务器获取
            ids.forEach(id => {
                  // 如果已经在加载中，跳过
                  if (loadingProducts.value.get(id)) return;

                  // 如果已经有缓存且不需要强制刷新，使用缓存
                  if (!forceRefresh && productDetailsMap.value.has(id)) {
                        const product = productDetailsMap.value.get(id)!;
                        result.set(id, product);
                        // 更新访问时间
                        accessTimeMap.value.set(id, Date.now());
                  } else {
                        // 需要从服务器获取
                        needFetchIds.push(id);
                  }
            });

            // 如果有需要获取的ID，批量获取
            if (needFetchIds.length > 0) {
                  // 标记这些ID为加载中
                  needFetchIds.forEach(id => loadingProducts.value.set(id, true));

                  try {
                        // 理想情况下，后端应该提供批量获取API
                        // 由于当前API不支持，我们使用Promise.all并行获取
                        const fetchPromises = needFetchIds.map(id =>
                              productService.getProductDetail(id, forceRefresh)
                                    .then(product => {
                                          // 更新缓存
                                          updateProductCache(product);
                                          result.set(id, product);
                                          return product;
                                    })
                                    .finally(() => {
                                          // 无论成功失败，都移除加载状态
                                          loadingProducts.value.delete(id);
                                    })
                        );

                        await Promise.all(fetchPromises);
                  } catch (err: any) {
                        error.value = err.message || '批量获取商品详情失败';
                        console.error('批量获取商品详情失败:', err);
                  }
            }

            return result;
      }

      // === 初始化 ===

      /**
       * 初始化商品Store
       */
      async function init(options = { loadHomeDataOnly: false }) {
            // 避免重复初始化
            if (isInitialized.value || isInitializing.value) return true;
            isInitializing.value = true;
            error.value = null;

            try {
                  // 注册事件监听
                  registerEventListeners();

                  // 初始化商品服务
                  await productService.init(options);

                  // 加载最近浏览商品
                  recentProducts.value = productService.getRecentProducts();

                  // 预加载最近浏览的商品详情到缓存
                  if (recentProducts.value.length > 0) {
                        const recentIds = recentProducts.value.map(p => p.id);
                        // 静默加载，不阻塞初始化流程
                        fetchProducts(recentIds).catch(e => console.error('预加载最近商品失败:', e));
                  }

                  isInitialized.value = true;
                  return true;
            } catch (err: any) {
                  error.value = err.message || '初始化产品数据失败';
                  console.error('初始化产品数据失败:', err);
                  return false;
            } finally {
                  isInitializing.value = false;
            }
      }

      /**
       * 注册事件监听器
       */
      function registerEventListeners() {
            // 避免重复注册
            if (unsubscribeCategoriesChange) return;

            // 监听分类变化
            unsubscribeCategoriesChange = productService.onCategoriesChange((newCategories) => {
                  categories.value = newCategories;
            });

            // 监听首页数据变化
            unsubscribeHomeDataChange = productService.onHomeDataChange((newHomeData) => {
                  homeData.value = newHomeData;
            });

            // 监听商品详情变化
            unsubscribeProductDetailChange = productService.onProductDetailChange((newProduct) => {
                  if (newProduct) {
                        // 更新缓存中的商品
                        updateProductCache(newProduct);
                  }
            });

            // 监听最近浏览商品变化
            unsubscribeRecentProductsChange = productService.onRecentProductsChange((newRecentProducts) => {
                  recentProducts.value = newRecentProducts;
            });
      }

      // === 商品数据获取方法 ===

      /**
       * 获取分类树
       */
      async function fetchCategoryTree(forceRefresh = false) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productService.getCategoryTree(forceRefresh);
                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取分类失败';
                  console.error('获取分类失败:', err);
                  return [];
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 获取首页数据
       */
      async function fetchHomeData(forceRefresh = false) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productService.getHomePageData(forceRefresh);
                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取首页数据失败';
                  console.error('获取首页数据失败:', err);
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 获取单个商品详情
       * @param id 商品ID
       * @param forceRefresh 是否强制刷新
       */
      async function fetchProductDetail(id: number, forceRefresh = false): Promise<ProductDetail | null> {
            if (!id) return null;

            // 标记为当前查看的商品
            currentProductId.value = id;

            // 如果已在加载中，避免重复请求
            if (loadingProducts.value.get(id)) {
                  // 返回一个Promise，等待现有请求完成
                  return new Promise((resolve) => {
                        const checkInterval = setInterval(() => {
                              if (!loadingProducts.value.get(id)) {
                                    clearInterval(checkInterval);
                                    resolve(productDetailsMap.value.get(id) || null);
                              }
                        }, 50);
                  });
            }

            // 检查缓存
            if (!forceRefresh && productDetailsMap.value.has(id)) {
                  const cachedProduct = productDetailsMap.value.get(id)!;
                  // 更新访问时间
                  accessTimeMap.value.set(id, Date.now());
                  return cachedProduct;
            }

            // 标记为加载中
            loadingProducts.value.set(id, true);
            loading.value = true;
            error.value = null;

            try {
                  const response = await productService.getProductDetail(id, forceRefresh);
                  // 更新缓存
                  updateProductCache(response);
                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取商品详情失败';
                  console.error('获取商品详情失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
                  loadingProducts.value.delete(id);
            }
      }

      /**
       * 获取完整商品详情（包含SKU信息）
       */
      async function fetchProductFullDetail(id: number, forceRefresh = false): Promise<ProductDetail | null> {
            if (!id) return null;

            // 标记为当前查看的商品
            currentProductId.value = id;

            // 检查是否已经在加载中
            if (loadingProducts.value.get(id)) {
                  // 等待现有请求完成
                  return new Promise((resolve) => {
                        const checkInterval = setInterval(() => {
                              if (!loadingProducts.value.get(id)) {
                                    clearInterval(checkInterval);
                                    resolve(productDetailsMap.value.get(id) || null);
                              }
                        }, 50);
                  });
            }

            // 获取缓存
            const cachedProduct = !forceRefresh ? productDetailsMap.value.get(id) : null;

            // 如果缓存有完整数据且不强制刷新，直接返回
            if (cachedProduct && cachedProduct.skus && cachedProduct.skus.length > 0 && !forceRefresh) {
                  // 更新访问时间
                  accessTimeMap.value.set(id, Date.now());
                  return cachedProduct;
            }

            // 标记为加载中
            loadingProducts.value.set(id, true);
            loading.value = true;
            error.value = null;

            try {
                  // 如果有缓存基础数据但需要获取SKU，复用缓存
                  if (cachedProduct && (!cachedProduct.skus || cachedProduct.skus.length === 0)) {
                        // 标记为正在加载SKU
                        const updatedProduct = { ...cachedProduct, loadingSkus: true };
                        updateProductCache(updatedProduct);

                        // 获取SKU数据
                        const skuData = await productService.getProductSkus(id);

                        // 合并数据
                        const fullProduct = {
                              ...updatedProduct,
                              skus: skuData.skus,
                              specs: skuData.specs,
                              validSpecCombinations: skuData.validSpecCombinations,
                              loadingSkus: false
                        };

                        // 更新缓存
                        updateProductCache(fullProduct);
                        return fullProduct;
                  } else {
                        // 完整加载商品详情
                        const fullProduct = await productService.getProductFullDetail(id, forceRefresh);
                        // 更新缓存
                        updateProductCache(fullProduct);
                        return fullProduct;
                  }
            } catch (err: any) {
                  error.value = err.message || '获取商品完整详情失败';
                  console.error('获取商品完整详情失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
                  loadingProducts.value.delete(id);
            }
      }

      /**
       * 获取商品SKU信息
       */
      async function fetchProductSkus(id: number) {
            if (!id) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await productService.getProductSkus(id);

                  // 更新缓存中的商品SKU数据
                  const cachedProduct = productDetailsMap.value.get(id);
                  if (cachedProduct) {
                        const updatedProduct = {
                              ...cachedProduct,
                              skus: response.skus,
                              specs: response.specs,
                              validSpecCombinations: response.validSpecCombinations,
                              loadingSkus: false
                        };
                        updateProductCache(updatedProduct);
                  }

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取商品SKU信息失败';
                  console.error('获取商品SKU信息失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 预加载分类页商品数据
       * @param products 商品列表
       */
      function prefetchProductDetails(products: Product[]): void {
            if (!products || products.length === 0) return;

            // 提取前5个商品ID进行预加载
            const idsToFetch = products
                  .slice(0, 5)
                  .map(p => p.id)
                  .filter(id => !productDetailsMap.value.has(id));

            if (idsToFetch.length > 0) {
                  // 静默加载，不显示loading状态，不等待结果
                  fetchProducts(idsToFetch).catch(e => {
                        console.error('预加载商品失败:', e);
                  });
            }
      }

      /**
       * 获取促销商品
       */
      async function fetchPromotionProducts(page: number = 1, limit: number = 10) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productService.getPromotionProducts(page, limit);

                  // 预加载商品详情
                  prefetchProductDetails(response.data);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取促销商品失败';
                  console.error('获取促销商品失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 获取最新商品
       */
      async function fetchLatestProducts(page: number = 1, limit: number = 10) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productService.getLatestProducts(page, limit);

                  // 预加载商品详情
                  prefetchProductDetails(response.data);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取最新商品失败';
                  console.error('获取最新商品失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 获取热销商品
       */
      async function fetchTopSellingProducts(page: number = 1, limit: number = 10) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productService.getTopSellingProducts(page, limit);

                  // 预加载商品详情
                  prefetchProductDetails(response.data);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取热销商品失败';
                  console.error('获取热销商品失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 搜索商品
       */
      async function searchProducts(params: SearchProductsParams) {
            searchLoading.value = true;
            error.value = null;

            try {
                  const response = await productService.searchProducts(params);
                  searchResults.value = response.data;

                  // 预加载商品详情
                  prefetchProductDetails(response.data);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '搜索商品失败';
                  throw err;
            } finally {
                  searchLoading.value = false;
            }
      }

      /**
       * 获取分类商品
       */
      async function fetchCategoryProducts(
            categoryId: number,
            page: number = 1,
            limit: number = 10,
            sort: 'newest' | 'price-asc' | 'price-desc' | 'sales' = 'newest'
      ) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productService.getCategoryProducts(categoryId, page, limit, sort);

                  // 预加载商品详情
                  prefetchProductDetails(response.data);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取分类商品失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 根据条件查询缓存的商品
       * @param predicate 查询条件
       */
      function queryProductsFromCache(predicate: (product: ProductDetail) => boolean): ProductDetail[] {
            const result: ProductDetail[] = [];

            productDetailsMap.value.forEach(product => {
                  if (predicate(product)) {
                        result.push(product);
                        // 更新访问时间
                        accessTimeMap.value.set(product.id, Date.now());
                  }
            });

            return result;
      }

      /**
       * 根据ID获取缓存中的商品
       * @param id 商品ID
       */
      function getProductFromCache(id: number): ProductDetail | null {
            const product = productDetailsMap.value.get(id) || null;

            if (product) {
                  // 更新访问时间
                  accessTimeMap.value.set(id, Date.now());
            }

            return product;
      }

      /**
       * 检查商品是否在缓存中
       * @param id 商品ID
       */
      function isProductInCache(id: number): boolean {
            return productDetailsMap.value.has(id);
      }

      // === 缓存管理方法 ===

      /**
       * 清除商品缓存
       * @param id 可选，指定清除的商品ID
       */
      function clearProductCache(id?: number) {
            if (id) {
                  // 清除指定商品缓存
                  productDetailsMap.value.delete(id);
                  accessTimeMap.value.delete(id);
                  loadingProducts.value.delete(id);

                  if (currentProductId.value === id) {
                        currentProductId.value = null;
                  }
            } else {
                  // 清除所有商品缓存
                  productDetailsMap.value.clear();
                  accessTimeMap.value.clear();
                  loadingProducts.value.clear();
                  currentProductId.value = null;
            }

            // 调用服务清除缓存
            productService.clearProductCache();
      }

      /**
       * 清除所有商品相关缓存
       */
      function clearAllProductCache() {
            productDetailsMap.value.clear();
            accessTimeMap.value.clear();
            loadingProducts.value.clear();
            currentProductId.value = null;
            productService.clearAllProductCache();
      }

      /**
       * 在一定时间后刷新分类
       */
      async function refreshCategoriesIfNeeded(forceRefresh = false) {
            if (productService.shouldRefreshCategories(forceRefresh)) {
                  await fetchCategoryTree(true);
            }
      }

      /**
       * 在一定时间后刷新首页数据
       */
      async function refreshHomeDataIfNeeded(forceRefresh = false) {
            if (productService.shouldRefreshHomeData(forceRefresh)) {
                  await fetchHomeData(true);
            }
      }

      /**
       * 清理资源
       */
      function dispose() {
            // 取消事件订阅
            if (unsubscribeCategoriesChange) {
                  unsubscribeCategoriesChange();
                  unsubscribeCategoriesChange = null;
            }

            if (unsubscribeHomeDataChange) {
                  unsubscribeHomeDataChange();
                  unsubscribeHomeDataChange = null;
            }

            if (unsubscribeProductDetailChange) {
                  unsubscribeProductDetailChange();
                  unsubscribeProductDetailChange = null;
            }

            if (unsubscribeRecentProductsChange) {
                  unsubscribeRecentProductsChange();
                  unsubscribeRecentProductsChange = null;
            }

            // 清理缓存数据
            productDetailsMap.value.clear();
            accessTimeMap.value.clear();
            loadingProducts.value.clear();
      }

    

      return {
            // 状态
            categories,
            homeData,
            currentProduct,
            currentProductId,
            searchResults,
            recentProducts,
            loading,
            searchLoading,
            error,
            isInitialized,
            isInitializing,
            productDetailsMap,
            cachedProductCount,

            // 计算属性
            latestProducts,
            topSellingProducts,

            // 基础方法
            init,
            dispose,

            // 数据获取
            fetchCategoryTree,
            fetchHomeData,
            fetchProductDetail,
            fetchProductFullDetail,
            fetchProductSkus,
            fetchProducts,
            searchProducts,
            fetchPromotionProducts,
            fetchLatestProducts,
            fetchTopSellingProducts,
            fetchCategoryProducts,

            // 缓存查询与管理
            getProductFromCache,
            isProductInCache,
            queryProductsFromCache,
            clearProductCache,
            clearAllProductCache,

            // 自动刷新
            refreshCategoriesIfNeeded,
            refreshHomeDataIfNeeded,

            // 预加载
            prefetchProductDetails
      };
});