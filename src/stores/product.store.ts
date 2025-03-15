// src/stores/product.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { productApi } from '@/api/product.api';
import { storage } from '@/utils/storage';
import type {
      Category,
      Product,
      ProductDetail,
      SearchProductsParams,
      HomePageData
} from '@/types/product.type';

// 缓存键
const CATEGORIES_KEY = 'product_categories';
const HOME_DATA_KEY = 'home_page_data';
const RECENT_PRODUCTS_KEY = 'recent_viewed_products';
const PRODUCT_DETAIL_PREFIX = 'product_detail_';

// 缓存时间
const CATEGORIES_EXPIRY = 24 * 60 * 60 * 1000; // 24小时
const HOME_DATA_EXPIRY = 4 * 60 * 60 * 1000;   // 4小时
const PRODUCT_DETAIL_EXPIRY = 30 * 60 * 1000;  // 30分钟
const RECENT_PRODUCTS_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天
const CATEGORY_PRODUCTS_EXPIRY = 10 * 60 * 1000; // 10分钟

export const useProductStore = defineStore('product', () => {
      // 状态
      const categories = ref<Category[]>([]);
      const homeData = ref<HomePageData | null>(null);
      const currentProduct = ref<ProductDetail | null>(null);
      const searchResults = ref<Product[]>([]);
      const recentProducts = ref<ProductDetail[]>([]);
      const loading = ref<boolean>(false);
      const searchLoading = ref<boolean>(false);
      const error = ref<string | null>(null);

      // 计算属性
      const latestProducts = computed(() => homeData.value?.latestProducts || []);
      const topSellingProducts = computed(() => homeData.value?.topSellingProducts || []);

      // 初始化
      async function init() {
            // 从缓存加载分类数据
            const cachedCategories = storage.get<Category[]>(CATEGORIES_KEY, null);
            if (cachedCategories && cachedCategories.length > 0) {
                  categories.value = cachedCategories;
            }

            // 从缓存加载首页数据
            const cachedHomeData = storage.get<HomePageData>(HOME_DATA_KEY, null);
            if (cachedHomeData) {
                  homeData.value = cachedHomeData;
            }

            // 从缓存加载最近浏览的商品
            const cachedRecentProducts = storage.get<ProductDetail[]>(RECENT_PRODUCTS_KEY, null);
            if (cachedRecentProducts && cachedRecentProducts.length > 0) {
                  recentProducts.value = cachedRecentProducts;
            }

            // 并行加载数据
            await Promise.all([
                  // 如果缓存为空，才请求新数据
                  (!cachedCategories || cachedCategories.length === 0) ? fetchCategoryTree() : Promise.resolve(),
                  !cachedHomeData ? fetchHomeData() : Promise.resolve()
            ]);
      }

      // 获取分类树
      async function fetchCategoryTree(forceRefresh = false) {
            // 如果已有数据且不强制刷新，直接返回
            if (categories.value.length > 0 && !forceRefresh) {
                  return categories.value;
            }

            // 尝试从缓存获取
            if (!forceRefresh) {
                  const cachedData = storage.get<Category[]>(CATEGORIES_KEY, null);
                  if (cachedData && cachedData.length > 0) {
                        categories.value = cachedData;
                        return cachedData;
                  }
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await productApi.getCategoryTree();
                  categories.value = response;
                  storage.set(CATEGORIES_KEY, categories.value, CATEGORIES_EXPIRY);
                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取分类失败';
                  console.error('获取分类失败:', err);
                  return [];
            } finally {
                  loading.value = false;
            }
      }

      // 获取首页数据
      async function fetchHomeData(forceRefresh = false) {
            // 如果已有数据且不强制刷新，直接返回
            if (homeData.value && !forceRefresh) {
                  return homeData.value;
            }

            // 尝试从缓存获取
            if (!forceRefresh) {
                  const cachedData = storage.get<HomePageData>(HOME_DATA_KEY, null);
                  if (cachedData) {
                        homeData.value = cachedData;
                        return cachedData;
                  }
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await productApi.getHomePageData();
                  homeData.value = response;
                  storage.set(HOME_DATA_KEY, homeData.value, HOME_DATA_EXPIRY);
                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取首页数据失败';
                  console.error('获取首页数据失败:', err);
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      // 获取商品详情
      async function fetchProductDetail(id: number, forceRefresh = false) {
            const cacheKey = `${PRODUCT_DETAIL_PREFIX}${id}`;

            // 如果当前正在查看的商品就是请求的商品且不强制刷新，直接返回
            if (currentProduct.value && currentProduct.value.id === id && !forceRefresh) {
                  addToRecentProducts(currentProduct.value);
                  return currentProduct.value;
            }

            // 尝试从缓存获取
            if (!forceRefresh) {
                  const cachedProduct = storage.get<ProductDetail>(cacheKey, null);
                  if (cachedProduct) {
                        currentProduct.value = cachedProduct;
                        addToRecentProducts(cachedProduct);
                        return cachedProduct;
                  }
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await productApi.getProductDetail(id);
                  currentProduct.value = response;

                  // 缓存商品详情
                  storage.set(cacheKey, response, PRODUCT_DETAIL_EXPIRY);

                  // 添加到最近浏览
                  addToRecentProducts(response);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取商品详情失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 获取完整商品详情（包含基础信息和SKU）
      async function fetchProductFullDetail(id: number, forceRefresh = false) {
            const cacheKey = `${PRODUCT_DETAIL_PREFIX}${id}`;

            // 如果当前正在查看的商品就是请求的商品且不强制刷新，直接返回
            if (currentProduct.value && currentProduct.value.id === id && !forceRefresh) {
                  addToRecentProducts(currentProduct.value);
                  return currentProduct.value;
            }

            // 尝试从缓存获取
            if (!forceRefresh) {
                  const cachedProduct = storage.get<ProductDetail>(cacheKey, null);
                  if (cachedProduct) {
                        currentProduct.value = cachedProduct;
                        addToRecentProducts(cachedProduct);
                        return cachedProduct;
                  }
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await productApi.getProductFullDetail(id);
                  currentProduct.value = response;

                  // 标记SKU已加载完成
                  if (currentProduct.value) {
                        currentProduct.value.loadingSkus = false;
                  }

                  // 缓存商品详情
                  storage.set(cacheKey, response, PRODUCT_DETAIL_EXPIRY);

                  // 添加到最近浏览
                  addToRecentProducts(response);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取商品详情失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 获取商品SKU信息
      async function fetchProductSkus(id: number) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productApi.getProductSkus(id);

                  // 如果当前有商品详情，将SKU信息合并到当前商品中
                  if (currentProduct.value && currentProduct.value.id === id) {
                        currentProduct.value = {
                              ...currentProduct.value,
                              skus: response.skus,
                              specs: response.specs,
                              validSpecCombinations: response.validSpecCombinations,
                              loadingSkus: false
                        };
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

      // 获取促销商品
      async function fetchPromotionProducts(page: number = 1, limit: number = 10) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productApi.getPromotionProducts(page, limit);
                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取促销商品失败';
                  console.error('获取促销商品失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 获取最新商品（不使用HomeData中的数据）
      async function fetchLatestProducts(page: number = 1, limit: number = 10) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productApi.getLatestProducts(page, limit);
                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取最新商品失败';
                  console.error('获取最新商品失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 获取热销商品（不使用HomeData中的数据）
      async function fetchTopSellingProducts(page: number = 1, limit: number = 10) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productApi.getTopSellingProducts(page, limit);
                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取热销商品失败';
                  console.error('获取热销商品失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 添加到最近浏览商品
      function addToRecentProducts(product: ProductDetail) {
            // 删除已存在的相同商品
            recentProducts.value = recentProducts.value.filter(p => p.id !== product.id);

            // 添加到最前面
            recentProducts.value.unshift(product);

            // 限制数量
            if (recentProducts.value.length > 10) {
                  recentProducts.value = recentProducts.value.slice(0, 10);
            }

            // 更新缓存
            storage.set(RECENT_PRODUCTS_KEY, recentProducts.value, RECENT_PRODUCTS_EXPIRY);
      }

      // 搜索商品
      async function searchProducts(params: SearchProductsParams) {
            searchLoading.value = true;
            error.value = null;

            try {
                  const response = await productApi.searchProducts(params);
                  searchResults.value = response.data;
                  return response;
            } catch (err: any) {
                  error.value = err.message || '搜索商品失败';
                  throw err;
            } finally {
                  searchLoading.value = false;
            }
      }

      // 获取分类商品
      async function fetchCategoryProducts(
            categoryId: number,
            page: number = 1,
            limit: number = 10,
            sort: 'newest' | 'price-asc' | 'price-desc' | 'sales' = 'newest'
      ) {
            // 对分类商品结果进行缓存
            const cacheKey = `category_products_${categoryId}_${page}_${limit}_${sort}`;
            const cachedData = storage.get(cacheKey, null);

            if (cachedData) {
                  return cachedData;
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await productApi.getCategoryProducts(categoryId, page, limit, sort);

                  // 只缓存第一页和少量数据，避免缓存过多数据
                  if (page === 1 && response.data.length <= 20) {
                        storage.set(cacheKey, response, CATEGORY_PRODUCTS_EXPIRY);
                  }

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取分类商品失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 清除商品缓存
      function clearProductCache() {
            // 清除首页数据缓存
            storage.remove(HOME_DATA_KEY);
            homeData.value = null;

            // 保留分类和最近浏览数据
      }

      // 清除所有商品相关缓存
      function clearAllProductCache() {
            storage.remove(CATEGORIES_KEY);
            storage.remove(HOME_DATA_KEY);
            // 清除所有商品详情缓存需要遍历localStorage，这里简化处理

            categories.value = [];
            homeData.value = null;
      }



      return {
            // 状态
            categories,
            homeData,
            currentProduct,
            searchResults,
            recentProducts,
            loading,
            searchLoading,
            error,

            // 计算属性
            latestProducts,
            topSellingProducts,

            // 动作
            init,
            fetchCategoryTree,
            fetchHomeData,
            fetchProductDetail,
            fetchProductFullDetail,
            searchProducts,
            fetchCategoryProducts,
            clearProductCache,
            clearAllProductCache,
            fetchProductSkus,
            fetchPromotionProducts,
            fetchLatestProducts,
            fetchTopSellingProducts,
            
      };
});