// src/stores/product.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { productApi } from '@/api/product.api';
import { createInitializeHelper } from '@/utils/store-helpers';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { toast } from '@/utils/toast.service'; 
import type { 
  Category, 
  Product, 
  ProductDetail, 
  SearchProductsParams, 
  SearchProductsResponse,
  HomePageData
} from '@/types/product.type';
import type { ApiError } from '@/types/common.type';

/**
 * 商品状态管理
 */
export const useProductStore = defineStore('product', () => {
  // 初始化辅助工具
  const { 
    initialized, 
    isInitialized, 
    canInitialize, 
    startInitialization, 
    completeInitialization, 
    failInitialization 
  } = createInitializeHelper('ProductStore');

  // 状态定义
  const categories = ref<Category[]>([]);
  const homePageData = ref<HomePageData | null>(null);
  const latestProducts = ref<Product[]>([]);
  const topSellingProducts = ref<Product[]>([]);
  const promotionProducts = ref<Product[]>([]);
  const productDetails = ref<Record<number, ProductDetail>>({});
  const currentCategory = ref<Category | null>(null);
  const searchResults = ref<Product[]>([]);
  const searchMeta = ref<any>(null);
  const loadingProducts = ref(false);
  const loadingCategories = ref(false);
  const loadingHomeData = ref(false);
  const loadingProductDetail = ref(false);
  const searchLoading = ref(false);
  
  // 计算属性
  const categoryTree = computed(() => categories.value);
  const rootCategories = computed(() => categories.value.filter(c => c.level === 1));
  const hasCategories = computed(() => categories.value.length > 0);

  /**
   * 初始化商品店铺
   */
  async function init(force: boolean = false): Promise<void> {
    if (!canInitialize(force)) return;
    
    startInitialization();
    
    try {
      // 尝试从缓存恢复数据
      await restoreDataFromCache();
      
      // 加载必要的初始数据
      await Promise.all([
        // 只有在没有分类数据时才加载
        !hasCategories.value ? loadCategories() : Promise.resolve(),
        // 如果没有首页数据则加载
        !homePageData.value ? loadHomePageData() : Promise.resolve()
      ]);
      
      completeInitialization();
    } catch (error) {
      failInitialization(error);
      toast.error('商品数据初始化失败，请刷新页面重试');
      throw error;
    }
  }

  /**
   * 从缓存恢复数据
   */
  async function restoreDataFromCache(): Promise<void> {
    // 尝试从缓存获取分类数据
    const cachedCategories = storage.getCategories<Category[]>();
    if (cachedCategories && cachedCategories.length > 0) {
      categories.value = cachedCategories;
    }
    
    // 尝试从缓存获取首页数据
    const cachedHomeData = storage.getHomeData<HomePageData>();
    if (cachedHomeData) {
      homePageData.value = cachedHomeData;
      
      if (cachedHomeData.latestProducts) {
        latestProducts.value = cachedHomeData.latestProducts;
      }
      
      if (cachedHomeData.topSellingProducts) {
        topSellingProducts.value = cachedHomeData.topSellingProducts;
      }
    }
  }

  /**
   * 加载分类数据
   */
  async function loadCategories(): Promise<Category[]> {
    try {
      loadingCategories.value = true;
      
      const result = await productApi.getCategoryTree();
      categories.value = result;
      
      // 缓存分类数据
      storage.saveCategories(result);
      
      return result;
    } catch (error) {
      console.error('加载分类失败:', error);
      toast.error('加载分类失败，请重试');
      throw error;
    } finally {
      loadingCategories.value = false;
    }
  }

  /**
   * 加载首页数据
   */
  async function loadHomePageData(): Promise<HomePageData> {
    try {
      loadingHomeData.value = true;
      
      const data = await productApi.getHomePageData();
      homePageData.value = data;
      
      // 更新相关商品列表
      if (data.latestProducts) {
        latestProducts.value = data.latestProducts;
      }
      
      if (data.topSellingProducts) {
        topSellingProducts.value = data.topSellingProducts;
      }
      
      // 缓存首页数据
      storage.saveHomeData(data);
      
      return data;
    } catch (error) {
      console.error('加载首页数据失败:', error);
      toast.error('加载首页数据失败，请重试');
      throw error;
    } finally {
      loadingHomeData.value = false;
    }
  }

  /**
   * 加载最新上架商品
   */
  async function loadLatestProducts(page: number = 1, limit: number = 10): Promise<void> {
    try {
      loadingProducts.value = true;
      
      const { data } = await productApi.getLatestProducts(page, limit);
      latestProducts.value = data;
    } catch (error) {
      console.error('加载最新商品失败:', error);
      toast.error('加载最新商品失败，请重试');
    } finally {
      loadingProducts.value = false;
    }
  }

  /**
   * 加载热销商品
   */
  async function loadTopSellingProducts(page: number = 1, limit: number = 10): Promise<void> {
    try {
      loadingProducts.value = true;
      
      const { data } = await productApi.getTopSellingProducts(page, limit);
      topSellingProducts.value = data;
    } catch (error) {
      console.error('加载热销商品失败:', error);
      toast.error('加载热销商品失败，请重试');
    } finally {
      loadingProducts.value = false;
    }
  }

  /**
   * 加载促销商品
   */
  async function loadPromotionProducts(page: number = 1, limit: number = 10): Promise<void> {
    try {
      loadingProducts.value = true;
      
      const { data } = await productApi.getPromotionProducts(page, limit);
      promotionProducts.value = data;
    } catch (error) {
      console.error('加载促销商品失败:', error);
      toast.error('加载促销商品失败，请重试');
    } finally {
      loadingProducts.value = false;
    }
  }

  /**
   * 加载分类商品
   */
  async function loadCategoryProducts(
    categoryId: number,
    page: number = 1,
    limit: number = 10,
    sort: 'newest' | 'price-asc' | 'price-desc' | 'sales' = 'newest'
  ): Promise<void> {
    try {
      loadingProducts.value = true;
      
      // 设置当前分类
      const category = categories.value.find(c => c.id === categoryId);
      if (category) {
        currentCategory.value = category;
      }
      
       await productApi.getCategoryProducts(categoryId, page, limit, sort);
       
    } catch (error) {
      console.error('加载分类商品失败:', error);
      toast.error('加载分类商品失败，请重试');
      throw error;
    } finally {
      loadingProducts.value = false;
    }
  }

  /**
   * 获取商品详情
   */
  async function getProductDetail(id: number, forceRefresh: boolean = false): Promise<ProductDetail> {
    try {
      loadingProductDetail.value = true;
      
      // 如果已有缓存且不是强制刷新，直接返回
      if (!forceRefresh && productDetails.value[id]) {
        return productDetails.value[id];
      }
      
      // 尝试从本地存储获取
      if (!forceRefresh) {
        const cachedDetail = storage.getProductDetail<ProductDetail>(id);
        if (cachedDetail) {
          productDetails.value[id] = cachedDetail;
          return cachedDetail;
        }
      }
      
      // 从API获取商品详情
      const detail = await productApi.getProductFullDetail(id);
      
      // 更新到store并缓存
      productDetails.value[id] = detail;
      storage.saveProductDetail(id, detail);
      
      return detail;
    } catch (error) {
      console.error(`获取商品${id}详情失败:`, error);
      toast.error('获取商品详情失败，请重试');
      throw error;
    } finally {
      loadingProductDetail.value = false;
    }
  }

  /**
   * 搜索商品
   */
  async function searchProducts(params: SearchProductsParams): Promise<SearchProductsResponse> {
    try {
      searchLoading.value = true;
      
      const result = await productApi.searchProducts(params);
      searchResults.value = result.data;
      searchMeta.value = result.meta;
      
      return result;
    } catch (error) {
      console.error('搜索商品失败:', error);
      toast.error('搜索商品失败，请重试');
      throw error;
    } finally {
      searchLoading.value = false;
    }
  }

  /**
   * 可取消的搜索商品
   */
  function searchProductsWithCancel(params: SearchProductsParams): {
    promise: Promise<SearchProductsResponse>;
    cancel: () => void;
  } {
    searchLoading.value = true;
    
    const { request, cancel } = productApi.searchProductsCancelable(params);
    
    const promise = request
      .then(result => {
        searchResults.value = result.data;
        searchMeta.value = result.meta;
        return result;
      })
      .catch((error: ApiError) => {
        // 只有在不是取消请求的情况下才显示错误
        if (error.message !== 'CanceledError') {
          console.error('搜索商品失败:', error);
          toast.error('搜索商品失败，请重试');
        }
        throw error;
      })
      .finally(() => {
        searchLoading.value = false;
      });
    
    return {
      promise,
      cancel
    };
  }

  /**
   * 清理商品详情缓存
   */
  function clearProductCache(productId?: number): void {
    if (productId) {
      delete productDetails.value[productId];
      storage.remove(`${STORAGE_KEYS.PRODUCT_DETAIL_PREFIX}${productId}`);
    } else {
      productDetails.value = {};
      storage.removeByPrefix(STORAGE_KEYS.PRODUCT_DETAIL_PREFIX);
    }
  }

  return {
    // 状态
    categories,
    homePageData,
    latestProducts,
    topSellingProducts,
    promotionProducts,
    productDetails,
    currentCategory,
    searchResults,
    searchMeta,
    loadingProducts,
    loadingCategories,
    loadingHomeData,
    loadingProductDetail,
    searchLoading,
    initialized,
    
    // 计算属性
    categoryTree,
    rootCategories,
    hasCategories,
    
    // 方法
    init,
    isInitialized,
    loadCategories,
    loadHomePageData,
    loadLatestProducts,
    loadTopSellingProducts,
    loadPromotionProducts,
    loadCategoryProducts,
    getProductDetail,
    searchProducts,
    searchProductsWithCancel,
    clearProductCache
  };
});