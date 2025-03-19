// src/stores/product.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/index.api';
import { storage } from '@/utils/storage';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import type {
    Category,
    Product,
    ProductDetail,
    SearchProductsParams,
    SearchProductsResponse,
    HomePageData,
} from '@/types/product.type';
import type { ApiError, PaginatedResponse } from '@/types/common.type';
import { createInitializeHelper } from '@/utils/store-helpers';

/**
 * 商品状态存储与服务
 * 集成状态管理和业务逻辑
 */
export const useProductStore = defineStore('product', () => {
    // 创建初始化助手
    const initHelper = createInitializeHelper('ProductStore');

    // ==================== 状态 ====================
    const categories = ref<Category[]>([]);
    const currentProduct = ref<ProductDetail | null>(null);
    const latestProducts = ref<Product[]>([]);
    const topSellingProducts = ref<Product[]>([]);
    const promotionProducts = ref<Product[]>([]);
    const categoryProducts = ref<Map<number, Product[]>>(new Map());
    const searchResults = ref<Product[]>([]);
    const homeData = ref<HomePageData | null>(null);
    const loading = ref<boolean>(false);
    const searchTotal = ref<number>(0);
    const searchPage = ref<number>(1);
    const searchLimit = ref<number>(10);
    const recentlyViewed = ref<Product[]>([]);

    // ==================== Getters ====================
    const categoriesLoaded = computed(() => categories.value.length > 0);
    const homeDataLoaded = computed(() => !!homeData.value);
    const hasMoreSearchResults = computed(() => searchTotal.value > searchResults.value.length);

    // ==================== 内部工具方法 ====================
    /**
     * 处理API错误
     * @param error API错误
     * @param customMessage 自定义错误消息
     */
    function handleError(error: ApiError, customMessage?: string): void {
        console.error(`[ProductStore] Error:`, error);

        // 显示错误提示
        const message = customMessage || error.message || '发生未知错误';
        toast.error(message);
    }

    /**
     * 设置事件监听
     */
    function setupEventListeners(): void {
        // 应用初始化事件
        eventBus.on(EVENT_NAMES.APP_INIT, () => {
            // 初始化分类
            getCategoryTree();

            // 初始化首页数据
            getHomePageData();
        });
    }

    // ==================== 状态管理方法 ====================
    /**
     * 设置分类树
     */
    function setCategories(categoryTree: Category[]) {
        categories.value = categoryTree;
    }

    /**
     * 设置当前商品
     */
    function setCurrentProduct(product: ProductDetail | null) {
        currentProduct.value = product;

        // 如果设置了有效商品，添加到最近浏览
        if (product) {
            addToRecentlyViewed(product);
        }
    }

    /**
     * 设置最新上架商品列表
     */
    function setLatestProducts(products: Product[]) {
        latestProducts.value = products;
    }

    /**
     * 设置销量最高商品列表
     */
    function setTopSellingProducts(products: Product[]) {
        topSellingProducts.value = products;
    }

    /**
     * 设置促销商品列表
     */
    function setPromotionProducts(products: Product[]) {
        promotionProducts.value = products;
    }

    /**
     * 设置分类商品列表
     */
    function setCategoryProducts(categoryId: number, products: Product[]) {
        categoryProducts.value.set(categoryId, products);
    }

    /**
     * 设置搜索结果
     */
    function setSearchResults(products: Product[], total: number, page: number, limit: number) {
        searchResults.value = products;
        searchTotal.value = total;
        searchPage.value = page;
        searchLimit.value = limit;
    }

    /**
     * 追加搜索结果
     */
    function appendSearchResults(products: Product[], total: number, page: number) {
        searchResults.value = [...searchResults.value, ...products];
        searchTotal.value = total;
        searchPage.value = page;
    }

    /**
     * 设置首页数据
     */
    function setHomeData(data: HomePageData) {
        homeData.value = data;
        setLatestProducts(data.latestProducts);
        setTopSellingProducts(data.topSellingProducts);
    }

    /**
     * 添加到最近浏览
     */
    function addToRecentlyViewed(product: Product | ProductDetail) {
        // 先移除已存在的相同商品
        recentlyViewed.value = recentlyViewed.value.filter(p => p.id !== product.id);

        // 添加到最前面
        recentlyViewed.value.unshift(product);

        // 限制最多保存10个
        if (recentlyViewed.value.length > 10) {
            recentlyViewed.value = recentlyViewed.value.slice(0, 10);
        }

        // 保存到本地存储
        storage.set(storage.STORAGE_KEYS.RECENT_PRODUCTS, recentlyViewed.value, storage.STORAGE_EXPIRY.RECENT_PRODUCTS);
    }

    /**
     * 设置加载状态
     */
    function setLoading(isLoading: boolean) {
        loading.value = isLoading;
    }

    /**
     * 清除商品数据
     */
    function clearProductData() {
        currentProduct.value = null;
        searchResults.value = [];
        searchTotal.value = 0;
        searchPage.value = 1;
    }

    // ==================== 业务逻辑方法 ====================
    /**
     * 获取分类树
     */
    async function getCategoryTree(): Promise<Category[]> {
        // 先尝试从本地存储获取
        const cachedCategories = storage.getCategories<Category[]>();
        if (cachedCategories && cachedCategories.length > 0) {
            setCategories(cachedCategories);
            return cachedCategories;
        }

        // 添加这两行
        if (loading.value) {
            return categories.value;
        }

        setLoading(true);

        try {
            const categoryTree = await api.productApi.getCategoryTree();

            // 缓存分类树
            storage.saveCategories(categoryTree);

            // 更新状态
            setCategories(categoryTree);

            return categoryTree;
        } catch (error: any) {
            handleError(error, '获取商品分类失败');
            return [];
        } finally {
            setLoading(false);
        }
    }

    /**
     * 获取最新上架商品
     * @param page 页码
     * @param limit 每页数量
     */
    async function getLatestProducts(page: number = 1, limit: number = 10): Promise<Product[]> {
        if (loading.value) {
            return latestProducts.value;
        }
        setLoading(true);

        try {
            const response = await api.productApi.getLatestProducts(page, limit);

            // 更新状态
            setLatestProducts(response.data);

            return response.data;
        } catch (error: any) {
            handleError(error, '获取最新商品失败');
            return [];
        } finally {
            setLoading(false);
        }
    }

    /**
     * 获取销量最高商品
     * @param page 页码
     * @param limit 每页数量
     */
    async function getTopSellingProducts(page: number = 1, limit: number = 10): Promise<Product[]> {
        if (loading.value) {
            return topSellingProducts.value;
        }
        setLoading(true);

        try {
            const response = await api.productApi.getTopSellingProducts(page, limit);

            // 更新状态
            setTopSellingProducts(response.data);

            return response.data;
        } catch (error: any) {
            handleError(error, '获取热销商品失败');
            return [];
        } finally {
            setLoading(false);
        }
    }

    /**
     * 获取促销商品
     * @param page 页码
     * @param limit 每页数量
     */
    async function getPromotionProducts(page: number = 1, limit: number = 10): Promise<Product[]> {
        if (loading.value) {
            return promotionProducts.value;
        }
        setLoading(true);

        try {
            const response = await api.productApi.getPromotionProducts(page, limit);

            // 更新状态
            setPromotionProducts(response.data);

            return response.data;
        } catch (error: any) {
            handleError(error, '获取促销商品失败');
            return [];
        } finally {
            setLoading(false);
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
    ): Promise<Product[]> {
        // 生成缓存键
        const cacheKey = `${storage.STORAGE_KEYS.CATEGORY_PRODUCTS_PREFIX}${categoryId}_${page}_${limit}_${sort}`;

        // 尝试从缓存获取
        const cachedProducts = storage.get<PaginatedResponse<Product>>(cacheKey);
        if (cachedProducts) {
            setCategoryProducts(categoryId, cachedProducts.data);
            return cachedProducts.data;
        }

        // 添加这两行
        if (loading.value) {
            return categoryProducts.value.get(categoryId) || [];
        }

        setLoading(true);

        try {
            const response = await api.productApi.getCategoryProducts(categoryId, page, limit, sort);

            // 缓存结果
            storage.set(cacheKey, response, storage.STORAGE_EXPIRY.CATEGORY_PRODUCTS);

            // 更新状态
            setCategoryProducts(categoryId, response.data);

            return response.data;
        } catch (error: any) {
            handleError(error, '获取分类商品失败');
            return [];
        } finally {
            setLoading(false);
        }
    }

    /**
     * 获取商品详情
     * @param id 商品ID
     * @param forceRefresh 是否强制刷新
     */
    async function getProductDetail(id: number, forceRefresh: boolean = false): Promise<ProductDetail | null> {
        // 如果不强制刷新，检查是否有缓存
        if (!forceRefresh) {
            const cachedProduct = storage.getProductDetail<ProductDetail>(id);
            if (cachedProduct) {
                setCurrentProduct(cachedProduct);
                return cachedProduct;
            }
        }

        // 添加这两行
        if (loading.value) {
            return currentProduct.value;
        }

        setLoading(true);

        try {
            // 先获取基本详情
            const productDetail = await api.productApi.getProductDetail(id);

            // 设置加载SKU标志
            const productWithLoadingFlag = {
                ...productDetail,
                loadingSkus: true
            };
            setCurrentProduct(productWithLoadingFlag);

            // 然后获取SKU信息
            try {
                const skusData = await api.productApi.getProductSkus(id);

                // 合并SKU信息到商品详情
                const fullProductDetail: ProductDetail = {
                    ...productDetail,
                    skus: skusData.skus,
                    specs: skusData.specs,
                    validSpecCombinations: skusData.validSpecCombinations,
                    loadingSkus: false
                };

                // 缓存完整商品详情
                storage.saveProductDetail(id, fullProductDetail);

                // 更新状态
                setCurrentProduct(fullProductDetail);

                return fullProductDetail;
            } catch (skuError) {
                // SKU加载失败，但基本信息已加载
                const basicProductDetail: ProductDetail = {
                    ...productDetail,
                    specs: [],
                    validSpecCombinations: {},
                    loadingSkus: false
                };

                setCurrentProduct(basicProductDetail);
                return basicProductDetail;
            }
        } catch (error: any) {
            handleError(error, '获取商品详情失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 搜索商品
     * @param params 搜索参数
     * @param append 是否追加到现有结果
     */
    async function searchProducts(params: SearchProductsParams, append: boolean = false): Promise<SearchProductsResponse | null> {
        // 添加这两行 - 注意这里不返回现有结果，因为搜索参数可能变化
        if (loading.value) {
            return null;
        }

        setLoading(true);

        try {
            const response = await api.productApi.searchProducts(params);

            // 更新状态
            if (append) {
                appendSearchResults(response.data, response.total, params.page || 1);
            } else {
                setSearchResults(response.data, response.total, params.page || 1, params.limit || 10);
            }

            return response;
        } catch (error: any) {
            handleError(error, '搜索商品失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 加载更多搜索结果
     * @param params 搜索参数
     */
    async function loadMoreSearchResults(params: SearchProductsParams): Promise<boolean> {
        if (!hasMoreSearchResults.value || loading.value) {
            return false;
        }

        // 设置下一页
        const nextPage = searchPage.value + 1;
        const searchParams = {
            ...params,
            page: nextPage,
            limit: searchLimit.value
        };

        try {
            await searchProducts(searchParams, true);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取首页数据
     */
    async function getHomePageData(): Promise<HomePageData | null> {
        // 尝试从缓存获取
        const cachedHomeData = storage.getHomeData<HomePageData>();
        if (cachedHomeData) {
            setHomeData(cachedHomeData);
            return cachedHomeData;
        }

        // 添加这两行
        if (loading.value) {
            return homeData.value;
        }

        setLoading(true);

        try {
            const data = await api.productApi.getHomePageData();

            // 缓存首页数据
            storage.saveHomeData(data);

            // 更新状态
            setHomeData(data);

            return data;
        } catch (error: any) {
            handleError(error, '获取首页数据失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 恢复最近浏览商品
     */
    function restoreRecentlyViewed(): void {
        const recentProducts = storage.get<Product[]>(storage.STORAGE_KEYS.RECENT_PRODUCTS, []);
        recentlyViewed.value = recentProducts || [];
    }

    /**
     * 初始化商品模块
     */
    async function init(): Promise<void> {
        if (!initHelper.canInitialize()) {
            return;
        }

        initHelper.startInitialization();

        try {
            // 恢复最近浏览记录
            restoreRecentlyViewed();

            // 获取分类树
            if (!categoriesLoaded.value) {
                await getCategoryTree();
            }

            // 获取首页数据
            if (!homeDataLoaded.value) {
                await getHomePageData();
            }

            // 初始化成功
            initHelper.completeInitialization();
        } catch (error) {
            initHelper.failInitialization(error);
            throw error;
        }
    }

    // 立即初始化事件监听
    setupEventListeners();

    return {
        // 状态
        categories,
        currentProduct,
        latestProducts,
        topSellingProducts,
        promotionProducts,
        categoryProducts,
        searchResults,
        homeData,
        loading,
        searchTotal,
        searchPage,
        searchLimit,
        recentlyViewed,

        // Getters
        categoriesLoaded,
        homeDataLoaded,
        hasMoreSearchResults,

        // 状态管理方法
        setCategories,
        setCurrentProduct,
        setLatestProducts,
        setTopSellingProducts,
        setPromotionProducts,
        setCategoryProducts,
        setSearchResults,
        setLoading,
        clearProductData,

        // 业务逻辑方法
        getCategoryTree,
        getLatestProducts,
        getTopSellingProducts,
        getPromotionProducts,
        getCategoryProducts,
        getProductDetail,
        searchProducts,
        loadMoreSearchResults,
        getHomePageData,
        restoreRecentlyViewed,
        init,
        isInitialized: initHelper.isInitialized
    };
});