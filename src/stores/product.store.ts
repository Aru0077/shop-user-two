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
      const isInitialized = ref<boolean>(false);
      const isInitializing = ref<boolean>(false);

      // 注册商品服务状态变化监听
      let unsubscribeCategoriesChange: (() => void) | null = null;
      let unsubscribeHomeDataChange: (() => void) | null = null;
      let unsubscribeProductDetailChange: (() => void) | null = null;
      let unsubscribeRecentProductsChange: (() => void) | null = null;

      // 计算属性
      const latestProducts = computed(() => homeData.value?.latestProducts || []);
      const topSellingProducts = computed(() => homeData.value?.topSellingProducts || []);

      // 初始化商品Store
      async function init(options = { loadHomeDataOnly: false }) {
            // 避免重复初始化
            if (isInitialized.value || isInitializing.value) return;
            isInitializing.value = true;
            error.value = null;

            try {
                  // 监听商品服务的状态变化
                  if (!unsubscribeCategoriesChange) {
                        unsubscribeCategoriesChange = productService.onCategoriesChange((newCategories) => {
                              categories.value = newCategories;
                        });
                  }

                  if (!unsubscribeHomeDataChange) {
                        unsubscribeHomeDataChange = productService.onHomeDataChange((newHomeData) => {
                              homeData.value = newHomeData;
                        });
                  }

                  if (!unsubscribeProductDetailChange) {
                        unsubscribeProductDetailChange = productService.onProductDetailChange((newProduct) => {
                              currentProduct.value = newProduct;
                        });
                  }

                  if (!unsubscribeRecentProductsChange) {
                        unsubscribeRecentProductsChange = productService.onRecentProductsChange((newRecentProducts) => {
                              recentProducts.value = newRecentProducts;
                        });
                  }

                  // 初始化商品服务
                  await productService.init(options);

                  // 加载最近浏览商品
                  recentProducts.value = productService.getRecentProducts();

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

      // 获取分类树
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

      // 获取首页数据
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

      // 获取商品详情
      async function fetchProductDetail(id: number, forceRefresh = false) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productService.getProductDetail(id, forceRefresh);
                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取商品详情失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 获取完整商品详情
      async function fetchProductFullDetail(id: number, forceRefresh = false) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productService.getProductFullDetail(id, forceRefresh);
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
                  const response = await productService.getProductSkus(id);
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
                  const response = await productService.getPromotionProducts(page, limit);
                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取促销商品失败';
                  console.error('获取促销商品失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 获取最新商品
      async function fetchLatestProducts(page: number = 1, limit: number = 10) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productService.getLatestProducts(page, limit);
                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取最新商品失败';
                  console.error('获取最新商品失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 获取热销商品
      async function fetchTopSellingProducts(page: number = 1, limit: number = 10) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await productService.getTopSellingProducts(page, limit);
                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取热销商品失败';
                  console.error('获取热销商品失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 搜索商品
      async function searchProducts(params: SearchProductsParams) {
            searchLoading.value = true;
            error.value = null;

            try {
                  const response = await productService.searchProducts(params);
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
            loading.value = true;
            error.value = null;

            try {
                  const response = await productService.getCategoryProducts(categoryId, page, limit, sort);
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
            productService.clearProductCache();
      }

      // 清除所有商品相关缓存
      function clearAllProductCache() {
            productService.clearAllProductCache();
      }

      // 在一定时间后刷新分类
      async function refreshCategoriesIfNeeded(forceRefresh = false) {
            if (productService.shouldRefreshCategories(forceRefresh)) {
                  await fetchCategoryTree(true);
            }
      }

      // 在一定时间后刷新首页数据
      async function refreshHomeDataIfNeeded(forceRefresh = false) {
            if (productService.shouldRefreshHomeData(forceRefresh)) {
                  await fetchHomeData(true);
            }
      }

      // 清理资源（适用于组件销毁时）
      function dispose() {
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
            isInitialized,
            isInitializing,

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
            refreshCategoriesIfNeeded,
            refreshHomeDataIfNeeded,
            dispose
      };
});