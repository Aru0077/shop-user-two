// src/services/product.service.ts
import { productApi } from '@/api/product.api';
import { storage, STORAGE_KEYS, STORAGE_EXPIRY } from '@/utils/storage';
import type {
      Category,
      Product,
      ProductDetail,
      SearchProductsParams,
      SearchProductsResponse,
      HomePageData,
      ProductSkusData
} from '@/types/product.type';
import type { PaginatedResponse } from '@/types/common.type';

// 状态变化回调类型
type CategoriesChangeCallback = (categories: Category[]) => void;
type HomeDataChangeCallback = (homeData: HomePageData | null) => void;
type ProductDetailChangeCallback = (product: ProductDetail | null) => void;
type RecentProductsChangeCallback = (products: ProductDetail[]) => void;

class ProductService {
      private lastCategoriesFetchTime: number = 0;
      private lastHomeDataFetchTime: number = 0;
      private categoriesChangeCallbacks: Set<CategoriesChangeCallback> = new Set();
      private homeDataChangeCallbacks: Set<HomeDataChangeCallback> = new Set();
      private productDetailChangeCallbacks: Set<ProductDetailChangeCallback> = new Set();
      private recentProductsChangeCallbacks: Set<RecentProductsChangeCallback> = new Set();
      private recentProducts: ProductDetail[] = [];

      constructor() {
            // 初始化时从存储中恢复最近浏览记录
            this.loadRecentProductsFromStorage();
      }

      /**
       * 初始化商品服务
       */
      async init(options = { loadHomeDataOnly: false }): Promise<boolean> {
            try {
                  // 首先尝试从缓存加载数据
                  const cachedHomeData = storage.getHomeData<HomePageData>();
                  if (cachedHomeData) {
                        this.notifyHomeDataChange(cachedHomeData);
                  } else {
                        await this.getHomePageData();
                  }

                  // 如果不是只加载首页数据，则加载分类数据
                  if (!options.loadHomeDataOnly) {
                        const cachedCategories = storage.getCategories<Category[]>();
                        if (!cachedCategories || cachedCategories.length === 0) {
                              await this.getCategoryTree();
                        } else {
                              this.notifyCategoriesChange(cachedCategories);
                        }
                  }

                  return true;
            } catch (err) {
                  console.error('商品服务初始化失败:', err);
                  return false;
            }
      }

      /**
       * 获取分类树
       * @param forceRefresh 是否强制刷新
       */
      async getCategoryTree(forceRefresh = false): Promise<Category[]> {
            // 尝试从缓存获取
            if (!forceRefresh) {
                  const cachedCategories = storage.getCategories<Category[]>();
                  if (cachedCategories && cachedCategories.length > 0) {
                        this.lastCategoriesFetchTime = Date.now();
                        this.notifyCategoriesChange(cachedCategories);
                        return cachedCategories;
                  }
            }

            try {
                  const categories = await productApi.getCategoryTree();
                  this.lastCategoriesFetchTime = Date.now();

                  // 缓存分类数据
                  storage.saveCategories(categories);

                  // 通知状态变化
                  this.notifyCategoriesChange(categories);

                  return categories;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 获取首页数据
       * @param forceRefresh 是否强制刷新
       */
      async getHomePageData(forceRefresh = false): Promise<HomePageData> {
            // 尝试从缓存获取
            if (!forceRefresh) {
                  const cachedHomeData = storage.getHomeData<HomePageData>();
                  if (cachedHomeData) {
                        this.lastHomeDataFetchTime = Date.now();
                        this.notifyHomeDataChange(cachedHomeData);
                        return cachedHomeData;
                  }
            }

            try {
                  const homeData = await productApi.getHomePageData();
                  this.lastHomeDataFetchTime = Date.now();

                  // 缓存首页数据
                  storage.saveHomeData(homeData);

                  // 通知状态变化
                  this.notifyHomeDataChange(homeData);

                  return homeData;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 获取商品详情
       * @param id 商品ID
       * @param forceRefresh 是否强制刷新
       */
      async getProductDetail(id: number, forceRefresh = false): Promise<ProductDetail> {
            const cacheKey = `${STORAGE_KEYS.PRODUCT_DETAIL_PREFIX}${id}`;

            // 尝试从缓存获取
            if (!forceRefresh) {
                  const cachedProduct = storage.get<ProductDetail>(cacheKey, null);
                  if (cachedProduct) {
                        this.addToRecentProducts(cachedProduct);
                        this.notifyProductDetailChange(cachedProduct);
                        return cachedProduct;
                  }
            }

            try {
                  const product = await productApi.getProductDetail(id);

                  // 缓存商品详情
                  storage.set(cacheKey, product, STORAGE_EXPIRY.PRODUCT_DETAIL);

                  // 添加到最近浏览
                  this.addToRecentProducts(product);

                  // 通知状态变化
                  this.notifyProductDetailChange(product);

                  return product;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 获取完整商品详情（包含基础信息和SKU）
       * @param id 商品ID
       * @param forceRefresh 是否强制刷新
       */
      async getProductFullDetail(id: number, forceRefresh = false): Promise<ProductDetail> {
            const cacheKey = `${STORAGE_KEYS.PRODUCT_DETAIL_PREFIX}${id}`;

            // 尝试从缓存获取
            if (!forceRefresh) {
                  const cachedProduct = storage.get<ProductDetail>(cacheKey, null);
                  if (cachedProduct && cachedProduct.skus && cachedProduct.skus.length > 0) {
                        this.addToRecentProducts(cachedProduct);
                        this.notifyProductDetailChange(cachedProduct);
                        return cachedProduct;
                  }
            }

            try {
                  const product = await productApi.getProductFullDetail(id);

                  // 标记SKU已加载完成
                  product.loadingSkus = false;

                  // 缓存商品详情
                  storage.set(cacheKey, product, STORAGE_EXPIRY.PRODUCT_DETAIL);

                  // 添加到最近浏览
                  this.addToRecentProducts(product);

                  // 通知状态变化
                  this.notifyProductDetailChange(product);

                  return product;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 获取商品SKU信息
       * @param id 商品ID
       */
      async getProductSkus(id: number): Promise<ProductSkusData> {
            try {
                  const skusData = await productApi.getProductSkus(id);

                  // 更新缓存中的商品详情
                  const cacheKey = `${STORAGE_KEYS.PRODUCT_DETAIL_PREFIX}${id}`;
                  const cachedProduct = storage.get<ProductDetail>(cacheKey, null);
                  if (cachedProduct) {
                        const updatedProduct = {
                              ...cachedProduct,
                              skus: skusData.skus,
                              specs: skusData.specs,
                              validSpecCombinations: skusData.validSpecCombinations,
                              loadingSkus: false
                        };

                        // 更新缓存
                        storage.set(cacheKey, updatedProduct, STORAGE_EXPIRY.PRODUCT_DETAIL);

                        // 通知状态变化
                        this.notifyProductDetailChange(updatedProduct);
                  }

                  return skusData;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 获取商品列表（各种类型）
       */
      async getLatestProducts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Product>> {
            try {
                  return await productApi.getLatestProducts(page, limit);
            } catch (err) {
                  throw err;
            }
      }

      async getTopSellingProducts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Product>> {
            try {
                  return await productApi.getTopSellingProducts(page, limit);
            } catch (err) {
                  throw err;
            }
      }

      async getPromotionProducts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Product>> {
            try {
                  return await productApi.getPromotionProducts(page, limit);
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 获取分类商品
       */
      async getCategoryProducts(
            categoryId: number,
            page: number = 1,
            limit: number = 10,
            sort: 'newest' | 'price-asc' | 'price-desc' | 'sales' = 'newest'
      ): Promise<PaginatedResponse<Product>> {
            // 生成缓存键
            const cacheKey = `${STORAGE_KEYS.CATEGORY_PRODUCTS_PREFIX}${categoryId}_${page}_${limit}_${sort}`;

            // 尝试从缓存获取
            const cachedData = storage.get<PaginatedResponse<Product>>(cacheKey, null);
            if (cachedData) {
                  return cachedData;
            }

            try {
                  const response = await productApi.getCategoryProducts(categoryId, page, limit, sort);

                  // 只缓存第一页和少量数据，避免缓存过多数据
                  if (page === 1 && response.data.length <= 20) {
                        storage.set(cacheKey, response, STORAGE_EXPIRY.CATEGORY_PRODUCTS);
                  }

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 搜索商品
       */
      async searchProducts(params: SearchProductsParams): Promise<SearchProductsResponse> {
            try {
                  return await productApi.searchProducts(params);
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 添加到最近浏览商品
       */
      private addToRecentProducts(product: ProductDetail): void {
            // 移除已存在的相同商品
            this.recentProducts = this.recentProducts.filter(p => p.id !== product.id);

            // 添加到最前面
            this.recentProducts.unshift(product);

            // 限制数量（最多保存10个）
            if (this.recentProducts.length > 10) {
                  this.recentProducts = this.recentProducts.slice(0, 10);
            }

            // 更新缓存
            storage.set(STORAGE_KEYS.RECENT_PRODUCTS, this.recentProducts, STORAGE_EXPIRY.RECENT_PRODUCTS);

            // 通知状态变化
            this.notifyRecentProductsChange(this.recentProducts);
      }

      /**
       * 从存储中加载最近浏览记录
       */
      private loadRecentProductsFromStorage(): void {
            const cachedRecentProducts = storage.get<ProductDetail[]>(STORAGE_KEYS.RECENT_PRODUCTS, []);
            this.recentProducts = cachedRecentProducts || [];
            this.notifyRecentProductsChange(this.recentProducts);
      }

      /**
       * 清除商品缓存
       */
      clearProductCache(): void {
            // 清除首页数据缓存
            storage.remove(STORAGE_KEYS.HOME_DATA);
            this.notifyHomeDataChange(null);
      }

      /**
       * 清除所有商品相关缓存
       */
      clearAllProductCache(): void {
            storage.remove(STORAGE_KEYS.CATEGORIES);
            storage.remove(STORAGE_KEYS.HOME_DATA);

            // 清除所有商品详情缓存
            for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.includes(STORAGE_KEYS.PRODUCT_DETAIL_PREFIX)) {
                        storage.remove(key.replace(storage['options'].prefix!, ''));
                  }
            }

            this.notifyCategoriesChange([]);
            this.notifyHomeDataChange(null);
            this.notifyProductDetailChange(null);
      }

      /**
       * 检查是否需要刷新分类数据
       */
      shouldRefreshCategories(forceRefresh = false): boolean {
            if (forceRefresh) return true;

            const now = Date.now();
            // 24小时刷新一次
            const refreshInterval = 24 * 60 * 60 * 1000;
            return (now - this.lastCategoriesFetchTime > refreshInterval);
      }

      /**
       * 检查是否需要刷新首页数据
       */
      shouldRefreshHomeData(forceRefresh = false): boolean {
            if (forceRefresh) return true;

            const now = Date.now();
            // 4小时刷新一次
            const refreshInterval = 4 * 60 * 60 * 1000;
            return (now - this.lastHomeDataFetchTime > refreshInterval);
      }

      /**
       * 获取最近浏览商品
       */
      getRecentProducts(): ProductDetail[] {
            return this.recentProducts;
      }

      /**
       * 添加分类变化监听器
       */
      onCategoriesChange(callback: CategoriesChangeCallback): () => void {
            this.categoriesChangeCallbacks.add(callback);
            return () => this.categoriesChangeCallbacks.delete(callback);
      }

      /**
       * 添加首页数据变化监听器
       */
      onHomeDataChange(callback: HomeDataChangeCallback): () => void {
            this.homeDataChangeCallbacks.add(callback);
            return () => this.homeDataChangeCallbacks.delete(callback);
      }

      /**
       * 添加商品详情变化监听器
       */
      onProductDetailChange(callback: ProductDetailChangeCallback): () => void {
            this.productDetailChangeCallbacks.add(callback);
            return () => this.productDetailChangeCallbacks.delete(callback);
      }

      /**
       * 添加最近浏览商品变化监听器
       */
      onRecentProductsChange(callback: RecentProductsChangeCallback): () => void {
            this.recentProductsChangeCallbacks.add(callback);
            return () => this.recentProductsChangeCallbacks.delete(callback);
      }

      /**
       * 通知分类变化
       */
      private notifyCategoriesChange(categories: Category[]): void {
            this.categoriesChangeCallbacks.forEach(callback => callback(categories));
      }

      /**
       * 通知首页数据变化
       */
      private notifyHomeDataChange(homeData: HomePageData | null): void {
            this.homeDataChangeCallbacks.forEach(callback => callback(homeData));
      }

      /**
       * 通知商品详情变化
       */
      private notifyProductDetailChange(product: ProductDetail | null): void {
            this.productDetailChangeCallbacks.forEach(callback => callback(product));
      }

      /**
       * 通知最近浏览商品变化
       */
      private notifyRecentProductsChange(products: ProductDetail[]): void {
            this.recentProductsChangeCallbacks.forEach(callback => callback(products));
      }

      /**
       * 清理资源
       */
      dispose(): void {
            this.categoriesChangeCallbacks.clear();
            this.homeDataChangeCallbacks.clear();
            this.productDetailChangeCallbacks.clear();
            this.recentProductsChangeCallbacks.clear();
      }
}

// 创建单例
export const productService = new ProductService();