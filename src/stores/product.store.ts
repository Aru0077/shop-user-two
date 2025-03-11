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

// 缓存时间
const CATEGORIES_EXPIRY = 24 * 60 * 60 * 1000; // 24小时
const HOME_DATA_EXPIRY = 4 * 60 * 60 * 1000;   // 4小时
const PRODUCT_DETAIL_EXPIRY = 30 * 60 * 1000;  // 30分钟
const RECENT_PRODUCTS_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天

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
        const cachedCategories = storage.get<Category[]>(CATEGORIES_KEY, []);
        if (cachedCategories.length > 0) {
            categories.value = cachedCategories;
        }

        // 从缓存加载首页数据
        const cachedHomeData = storage.get<HomePageData>(HOME_DATA_KEY, null);
        if (cachedHomeData) {
            homeData.value = cachedHomeData;
        }

        // 从缓存加载最近浏览的商品
        const cachedRecentProducts = storage.get<ProductDetail[]>(RECENT_PRODUCTS_KEY, []);
        if (cachedRecentProducts.length > 0) {
            recentProducts.value = cachedRecentProducts;
        }

        // 初始加载分类和首页数据
        await Promise.all([
            fetchCategoryTree(),
            fetchHomeData()
        ]);
    }

    // 获取分类树
    async function fetchCategoryTree() {
        if (categories.value.length > 0) return categories.value;

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
    async function fetchHomeData() {
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
    async function fetchProductDetail(id: number) {
        loading.value = true;
        error.value = null;

        try {
            // 检查缓存
            const cacheKey = `product_detail_${id}`;
            const cachedProduct = storage.get<ProductDetail>(cacheKey, null);

            if (cachedProduct) {
                currentProduct.value = cachedProduct;
                addToRecentProducts(cachedProduct);
                return cachedProduct;
            }

            // 从API获取
            const response = await productApi.getProductDetail(id);
            currentProduct.value = response;

            // 缓存
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
        loading.value = true;
        error.value = null;

        try {
            const response = await productApi.getCategoryProducts(categoryId, page, limit, sort);
            return response;
        } catch (err: any) {
            error.value = err.message || '获取分类商品失败';
            throw err;
        } finally {
            loading.value = false;
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

        // 计算属性
        latestProducts,
        topSellingProducts,

        // 动作
        init,
        fetchCategoryTree,
        fetchHomeData,
        fetchProductDetail,
        searchProducts,
        fetchCategoryProducts
    };
});