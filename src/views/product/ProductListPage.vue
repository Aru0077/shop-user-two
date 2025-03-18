<template>
    <div class="pageContent pb-20">
        <!-- 页面标题 -->
        <PageTitle :mainTitle="pageTitle" />

        <!-- 间距占位符 -->
        <div class="w-full h-4"></div>

        <!-- 加载状态 -->
        <div v-if="loading && products.length === 0" class="flex justify-center items-center h-40">
            <div
                class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-r-transparent align-middle">
            </div>
        </div>

        <!-- 商品列表 -->
        <div v-else-if="products.length > 0">
            <ProductGrid :products="products" :maxItems="1000" />

            <!-- 底部加载更多 -->
            <div v-if="hasMore" class="mt-4 flex justify-center">
                <button @click="loadMore" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"
                    :disabled="loadingMore">
                    <div v-if="loadingMore"
                        class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-gray-500 border-r-transparent align-middle mr-2">
                    </div>
                    {{ loadingMore ? '加载中...' : '加载更多' }}
                </button>
            </div>
        </div>

        <!-- 空结果 -->
        <div v-else class="flex flex-col items-center justify-center h-60">
            <Package class="w-12 h-12 text-gray-300 mb-2" />
            <div class="text-gray-500 mb-4">暂无商品</div>
            <button @click="goToHome" class="bg-black text-white py-2 px-6 rounded-full flex items-center">
                <Home class="w-4 h-4 mr-1" />
                返回首页
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Package, Home } from 'lucide-vue-next';
import { useProductStore } from '@/stores/product.store';
import { useToast } from '@/composables/useToast';
import PageTitle from '@/components/common/PageTitle.vue';
import ProductGrid from '@/components/product/ProductGrid.vue';
import type { Product } from '@/types/product.type';
import type { PaginatedResponse } from '@/types/common.type';

// 初始化
const route = useRoute();
const router = useRouter();
const productStore = useProductStore();
const toast = useToast();

// 状态
const products = ref<Product[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref<string | null>(null);
const currentPage = ref(1);
const hasMore = ref(true);

// 页面配置
const pageSize = 10; // 每页显示的商品数量

// 类型和标题
const listType = computed(() => route.params.type as string);
const pageTitle = computed(() => {
    if (listType.value === 'latest') return 'New Arrivals';
    if (listType.value === 'topselling') return 'Best Sellers';
    if (listType.value === 'promotion') return 'Promotional Products';
    if (listType.value.startsWith('category-')) {
        const categoryId = Number(listType.value.split('-')[1]);
        const category = productStore.categories.find(c => c.id === categoryId);
        return category?.name || '分类商品';
    }
    return '商品列表';
});

// 重置数据并加载
const resetAndLoadData = () => {
    products.value = [];
    currentPage.value = 1;
    hasMore.value = true;
    loadProducts();
};

// 根据类型加载商品
const loadProducts = async () => {
    if (loading.value && currentPage.value > 1) {
        loadingMore.value = true;
    } else {
        loading.value = true;
    }

    error.value = null;

    try {
        // 确保 productStore 已初始化
        if (!productStore.isInitialized && !productStore.isInitializing) {
            await productStore.init();
        } else if (productStore.isInitializing) {
            // 等待初始化完成
            await new Promise<void>((resolve) => {
                const unwatch = watch(() => productStore.isInitializing, (isInitializing) => {
                    if (!isInitializing) {
                        unwatch();
                        resolve();
                    }
                });
            });
        }
        
        let response: PaginatedResponse<Product> | null = null;

        // 根据不同的类型调用不同的API
        if (listType.value === 'latest') {
            response = await productStore.fetchLatestProducts(currentPage.value, pageSize);
        } else if (listType.value === 'topselling') {
            response = await productStore.fetchTopSellingProducts(currentPage.value, pageSize);
        } else if (listType.value === 'promotion') {
            response = await productStore.fetchPromotionProducts(currentPage.value, pageSize);
        } else if (listType.value.startsWith('category-')) {
            const categoryId = Number(listType.value.split('-')[1]);
            // 确保分类数据已更新
            await productStore.refreshCategoriesIfNeeded();
            response = await productStore.fetchCategoryProducts(
                categoryId,
                currentPage.value,
                pageSize
            );
        }

        if (response) {
            if (currentPage.value === 1) {
                products.value = response.data;
            } else {
                products.value = [...products.value, ...response.data];
            }

            // 检查是否还有更多数据
            hasMore.value = products.value.length < response.total;
        }
    } catch (err: any) {
        error.value = err.message || '加载商品失败';
        if (error.value) {
            toast.error(error.value);
        }
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
};

// 加载更多商品
const loadMore = () => {
    if (hasMore.value && !loadingMore.value) {
        currentPage.value++;
        loadProducts();
    }
};

// 返回首页
const goToHome = () => {
    router.push('/home');
};

// 页面加载时初始化数据
onMounted(async () => {
    // 确保分类数据已加载（如果是分类页面）
    if (listType.value.startsWith('category-') && productStore.categories.length === 0) {
        await productStore.fetchCategoryTree();
    }

    // 监听路由参数变化
    watch(
        () => route.params.type,
        () => {
            resetAndLoadData();
        }
    );

    // 初始加载数据
    resetAndLoadData();
});

// 添加 onBeforeUnmount 钩子清理资源
onBeforeUnmount(() => {
    if (productStore.dispose) {
        productStore.dispose();
    }
});
</script>