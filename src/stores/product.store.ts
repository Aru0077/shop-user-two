// src/stores/product.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { productApi } from '@/api/product.api';
import { storage } from '@/utils/storage';
import { createInitializeHelper } from '@/utils/store-helpers';
import { toast } from '@/utils/toast.service';
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
import type { ApiError } from '@/types/common.type';

/**
 * 商品管理Store
 * 负责商品数据的管理和同步
 */
export const useProductStore = defineStore('product', () => {
    // 初始化助手
    const initHelper = createInitializeHelper('ProductStore');

    // 状态
    const categories = ref<Category[]>([]);
    const latestProducts = ref<Product[]>([]);
    const topSellingProducts = ref<Product[]>([]);
    const promotionProducts = ref<Product[]>([]);
    const categoryProducts = ref<Map<number, Product[]>>(new Map());
    const productDetails = ref<Map<number, ProductDetail>>(new Map());
    const homeData = ref<HomePageData | null>(null);
    const searchResults = ref<Product[]>([]);
    const searchMeta = ref<any>(null);
    const searchTotal = ref(0);
    const recentlyViewed = ref<Product[]>([]);
    const loading = ref(false);
    const searching = ref(false);
    const error = ref<string | null>(null);

    // 计算属性
    const categoriesTree = computed(() => {
        return categories.value || [];
    });

    const flattenedCategories = computed(() => {
        const flatList: Category[] = [];

        const flatten = (cats: Category[], level: number = 0) => {
            cats.forEach(cat => {
                flatList.push({
                    ...cat,
                    level
                });

                if (cat.children && cat.children.length > 0) {
                    flatten(cat.children, level + 1);
                }
            });
        };

        flatten(categories.value);
        return flatList;
    });

    // ==================== 内部工具方法 ====================
    /**
     * 处理API错误
     */
    function handleError(error: ApiError, customMessage?: string): void {
        console.error(`[ProductStore] Error:`, error);
        const message = customMessage || error.message || 'An unknown error occurred';
        toast.error(message);
    }

    /**
     * 确保已初始化
     */
    async function ensureInitialized(): Promise<void> {
        if (!initHelper.isInitialized()) {
            console.info('[ProductStore] 数据未初始化，正在初始化...');
            await init();
        }
    }

    /**
     * 添加到最近浏览
     * @param product 商品对象
     */
    function addToRecentlyViewed(product: Product): void {
        // 移除已存在的相同商品
        const existingIndex = recentlyViewed.value.findIndex(p => p.id === product.id);
        if (existingIndex !== -1) {
            recentlyViewed.value.splice(existingIndex, 1);
        }

        // 添加到最前面
        recentlyViewed.value.unshift(product);

        // 限制数量为10个
        if (recentlyViewed.value.length > 10) {
            recentlyViewed.value.pop();
        }

        // 保存到本地缓存
        storage.set(storage.STORAGE_KEYS.RECENT_PRODUCTS, recentlyViewed.value, storage.STORAGE_EXPIRY.RECENT_PRODUCTS);
    }

    /**
     * 从本地缓存加载最近浏览记录
     */
    function loadRecentlyViewed(): void {
        const data = storage.get<Product[]>(storage.STORAGE_KEYS.RECENT_PRODUCTS, []);
        if (data && data.length > 0) {
            recentlyViewed.value = data;
        }
    }

    // ==================== 业务逻辑方法 ====================
    /**
     * 获取商品分类树
     */
    async function getCategoryTree(): Promise<Category[]> {
        try {
            loading.value = true;
            error.value = null;

            // 尝试从缓存获取
            const cachedCategories = storage.getCategories<Category[]>();
            if (cachedCategories) {
                categories.value = cachedCategories;
                return cachedCategories;
            }

            // 从API获取
            const categoryTree = await productApi.getCategoryTree();
            categories.value = categoryTree;

            // 缓存到本地
            storage.saveCategories(categoryTree);

            return categoryTree;
        } catch (err: any) {
            handleError(err, 'Failed to get product categories');
            return [];
        } finally {
            loading.value = false;
        }
    }

    /**
     * 获取最新上架商品
     * @param page 页码
     * @param limit 每页数量
     */
    async function getLatestProducts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Product> | null> {
        try {
            loading.value = true;
            error.value = null;

            const response = await productApi.getLatestProducts(page, limit);
            latestProducts.value = response.data;

            return response;
        } catch (err: any) {
            handleError(err, 'Failed to get latest products');
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 获取销量最高商品
     * @param page 页码
     * @param limit 每页数量
     */
    async function getTopSellingProducts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Product> | null> {
        try {
            loading.value = true;
            error.value = null;

            const response = await productApi.getTopSellingProducts(page, limit);
            topSellingProducts.value = response.data;

            return response;
        } catch (err: any) {
            handleError(err, 'Failed to get top-selling products');
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 获取促销商品
     * @param page 页码
     * @param limit 每页数量
     */
    async function getPromotionProducts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Product> | null> {
        try {
            loading.value = true;
            error.value = null;

            const response = await productApi.getPromotionProducts(page, limit);
            promotionProducts.value = response.data;

            return response;
        } catch (err: any) {
            handleError(err, 'Failed to get promotional products');
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 获取分类下的商品
     * @param categoryId 分类ID
     * @param page 页码
     * @param limit 每页数量
     * @param sort 排序方式
     */
    async function getCategoryProducts(
        categoryId: number,
        page: number = 1,
        limit: number = 10,
        sort: 'newest' | 'price-asc' | 'price-desc' | 'sales' = 'newest'
    ): Promise<PaginatedResponse<Product> | null> {
        try {
            loading.value = true;
            error.value = null;

            // 生成缓存键
            const cacheKey = `${storage.STORAGE_KEYS.CATEGORY_PRODUCTS_PREFIX}${categoryId}_page${page}_limit${limit}_sort${sort}`;

            // 尝试从缓存获取
            const cachedProducts = storage.get<PaginatedResponse<Product>>(cacheKey, null);
            if (cachedProducts) {
                if (!categoryProducts.value.has(categoryId)) {
                    categoryProducts.value.set(categoryId, []);
                }
                categoryProducts.value.set(categoryId, cachedProducts.data);
                return cachedProducts;
            }

            // 从API获取
            const response = await productApi.getCategoryProducts(categoryId, page, limit, sort);

            // 更新本地状态
            if (!categoryProducts.value.has(categoryId)) {
                categoryProducts.value.set(categoryId, []);
            }
            categoryProducts.value.set(categoryId, response.data);

            // 缓存到本地
            storage.set(cacheKey, response, storage.STORAGE_EXPIRY.CATEGORY_PRODUCTS);

            return response;
        } catch (err: any) {
            handleError(err, 'Failed to get category products');
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 获取商品详情
     * @param id 商品ID
     */
    async function getProductDetail(id: number): Promise<ProductDetail | null> {
        try {
            loading.value = true;
            error.value = null;

            // 尝试从本地状态获取
            if (productDetails.value.has(id)) {
                const product = productDetails.value.get(id)!;

                // 添加到最近浏览
                addToRecentlyViewed(product);

                return product;
            }

            // 尝试从缓存获取
            const cachedDetail = storage.getProductDetail<ProductDetail>(id);
            if (cachedDetail) {
                productDetails.value.set(id, cachedDetail);

                // 添加到最近浏览
                addToRecentlyViewed(cachedDetail);

                return cachedDetail;
            }

            // 从API获取
            const detail = await productApi.getProductDetail(id);
            productDetails.value.set(id, detail);

            // 缓存到本地
            storage.saveProductDetail(id, detail);

            // 添加到最近浏览
            addToRecentlyViewed(detail);

            return detail;
        } catch (err: any) {
            handleError(err, 'Failed to get product details');
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 获取商品SKU信息
     * @param id 商品ID
     */
    async function getProductSkus(id: number): Promise<ProductSkusData | null> {
        try {
            loading.value = true;
            error.value = null;

            // 从API获取
            const skusData = await productApi.getProductSkus(id);

            // 更新商品详情中的规格信息
            if (productDetails.value.has(id)) {
                const detail = productDetails.value.get(id)!;
                detail.skus = skusData.skus;
                detail.specs = skusData.specs;
                detail.validSpecCombinations = skusData.validSpecCombinations;
                productDetails.value.set(id, detail);

                // 更新缓存
                storage.saveProductDetail(id, detail);
            }

            return skusData;
        } catch (err: any) {
            handleError(err, 'Failed to get product specification information');
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 搜索商品
     * @param params 搜索参数
     */
    async function searchProducts(params: SearchProductsParams): Promise<SearchProductsResponse | null> {
        try {
            searching.value = true;
            error.value = null;

            const response = await productApi.searchProducts(params);
            searchResults.value = response.data;
            searchMeta.value = response.meta;
            searchTotal.value = response.total;

            return response;
        } catch (err: any) {
            handleError(err, 'Failed to search products');
            return null;
        } finally {
            searching.value = false;
        }
    }

    /**
     * 获取首页数据
     */
    async function getHomePageData(): Promise<HomePageData | null> {
        try {
            loading.value = true;
            error.value = null;

            // 尝试从缓存获取
            const cachedData = storage.getHomeData<HomePageData>();
            if (cachedData) {
                homeData.value = cachedData;
                latestProducts.value = cachedData.latestProducts;
                topSellingProducts.value = cachedData.topSellingProducts;
                return cachedData;
            }

            // 从API获取
            const data = await productApi.getHomePageData();
            homeData.value = data;
            latestProducts.value = data.latestProducts;
            topSellingProducts.value = data.topSellingProducts;

            // 缓存到本地
            storage.saveHomeData(data);

            return data;
        } catch (err: any) {
            handleError(err, 'Failed to get homepage data');
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
  * 获取完整商品详情（包含SKU信息）
  * @param id 商品ID
  */
    async function getProductFullDetail(id: number): Promise<ProductDetail | null> {
        try {
            loading.value = true;
            error.value = null;

            // 1. 尝试从本地状态获取
            if (productDetails.value.has(id)) {
                const product = productDetails.value.get(id)!;

                // 检查是否包含完整信息（SKU和规格信息）
                if (product.skus && product.skus.length > 0 && product.specs && product.specs.length > 0) {
                    console.info(`[ProductStore] 从本地状态获取商品完整信息: ${id}`);

                    // 添加到最近浏览
                    addToRecentlyViewed(product);

                    return product;
                }
            }

            // 2. 尝试从缓存获取
            const cachedDetail = storage.getProductDetail<ProductDetail>(id);
            if (cachedDetail) {
                // 检查缓存中是否包含完整信息
                if (cachedDetail.skus && cachedDetail.skus.length > 0 &&
                    cachedDetail.specs && cachedDetail.specs.length > 0) {
                    console.info(`[ProductStore] 从缓存获取商品完整信息: ${id}`);

                    // 更新本地状态
                    productDetails.value.set(id, cachedDetail);

                    // 添加到最近浏览
                    addToRecentlyViewed(cachedDetail);

                    return cachedDetail;
                }
            }

            // 3. 缓存中没有完整信息，从API获取
            console.info(`[ProductStore] 从API获取商品完整信息: ${id}`);
            const detail = await productApi.getProductFullDetail(id);
            productDetails.value.set(id, detail);

            // 缓存到本地
            storage.saveProductDetail(id, detail);

            // 添加到最近浏览
            addToRecentlyViewed(detail);

            return detail;
        } catch (err: any) {
            handleError(err, 'Failed to get complete product information');
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 清除商品状态
     */
    function clearProductState(): void {
        categories.value = [];
        latestProducts.value = [];
        topSellingProducts.value = [];
        promotionProducts.value = [];
        categoryProducts.value.clear();
        productDetails.value.clear();
        homeData.value = null;
        searchResults.value = [];
        searchMeta.value = null;
        searchTotal.value = 0;
        error.value = null;

        // 清除本地缓存
        storage.remove(storage.STORAGE_KEYS.CATEGORIES);
        storage.remove(storage.STORAGE_KEYS.HOME_DATA);
        storage.removeByPrefix(storage.STORAGE_KEYS.PRODUCT_DETAIL_PREFIX);
        storage.removeByPrefix(storage.STORAGE_KEYS.CATEGORY_PRODUCTS_PREFIX);
    }

    /**
     * 初始化商品模块
     */
    async function init(force: boolean = false): Promise<void> {
        if (!initHelper.canInitialize(force)) {
            return;
        }

        initHelper.startInitialization();

        try {
            // 1. 加载商品分类
            await getCategoryTree();

            // 2. 加载首页数据
            await getHomePageData();

            // 3. 加载最近浏览记录
            loadRecentlyViewed();

            // 初始化成功
            initHelper.completeInitialization();
        } catch (error) {
            initHelper.failInitialization(error);
            throw error;
        }
    }

    return {
        // 状态
        categories,
        latestProducts,
        topSellingProducts,
        promotionProducts,
        categoryProducts,
        productDetails,
        homeData,
        searchResults,
        searchMeta,
        searchTotal,
        recentlyViewed,
        loading,
        searching,
        error,

        // 计算属性
        categoriesTree,
        flattenedCategories,

        // 业务逻辑方法
        getCategoryTree,
        getLatestProducts,
        getTopSellingProducts,
        getPromotionProducts,
        getCategoryProducts,
        getProductDetail,
        getProductSkus,
        searchProducts,
        getHomePageData,
        getProductFullDetail,
        addToRecentlyViewed,
        clearProductState,
        init,

        // 初始化状态
        isInitialized: initHelper.isInitialized,
        ensureInitialized
    };
});