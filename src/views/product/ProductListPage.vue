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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Package, Home } from 'lucide-vue-next';
import { useProductStore } from '@/stores/product.store';
import { useToast } from '@/composables/useToast';
import PageTitle from '@/components/common/PageTitle.vue';
import ProductGrid from '@/components/product/ProductGrid.vue';
import type { Product } from '@/types/product.type';

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
const pageSize = ref(10);
const hasMore = ref(true);

// 列表类型和标题
const listType = computed(() => route.params.type as string);
const pageTitle = computed(() => {
    if (listType.value === 'latest') return '最新上架';
    if (listType.value === 'topselling') return '热销商品';
    if (listType.value === 'promotion') return '促销商品';
    if (listType.value.startsWith('category-')) {
        const categoryId = Number(listType.value.split('-')[1]);
        const category = productStore.categories.find(c => c.id === categoryId);
        return category?.name || '分类商品';
    }
    return '商品列表';
});

// 加载商品列表
const loadProducts = async (isLoadMore = false) => {
    if (isLoadMore) {
        loadingMore.value = true;
    } else {
        loading.value = true;
    }
    error.value = null;

    try {
        let newProducts: Product[] = [];

        // 根据不同的类型调用不同的API
        if (listType.value === 'latest') {
            newProducts = await productStore.getLatestProducts(currentPage.value, pageSize.value);
        } else if (listType.value === 'topselling') {
            newProducts = await productStore.getTopSellingProducts(currentPage.value, pageSize.value);
        } else if (listType.value === 'promotion') {
            newProducts = await productStore.getPromotionProducts(currentPage.value, pageSize.value);
        } else if (listType.value.startsWith('category-')) {
            const categoryId = Number(listType.value.split('-')[1]);
            newProducts = await productStore.getCategoryProducts(
                categoryId,
                currentPage.value,
                pageSize.value
            );
        }

        // 更新商品列表
        if (isLoadMore) {
            products.value = [...products.value, ...newProducts];
        } else {
            products.value = newProducts;
        }

        // 判断是否还有更多商品
        hasMore.value = newProducts.length >= pageSize.value;
    } catch (err: any) {
        error.value = err.message || '加载商品失败';
        toast.error(error.value || '加载商品失败');
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
};

// 加载更多商品
const loadMore = async () => {
    if (hasMore.value && !loadingMore.value) {
        currentPage.value++;
        await loadProducts(true);
    }
};

// 重置并加载商品
const resetAndLoad = () => {
    products.value = [];
    currentPage.value = 1;
    hasMore.value = true;
    loadProducts();
};

// 返回首页
const goToHome = () => {
    router.push('/home');
};

// 页面加载时初始化
onMounted(async () => {
    // 初始化productStore
    await productStore.init();
    
    // 如果是分类页面且分类数据为空，获取分类树
    if (listType.value.startsWith('category-') && productStore.categories.length === 0) {
        await productStore.getCategoryTree();
    }
    
    // 加载商品列表
    resetAndLoad();
    
    // 监听路由变化
    watch(() => route.params.type, () => {
        resetAndLoad();
    });
});

// 组件卸载前清理资源
onUnmounted(() => {
    // 清除商品列表，避免内存泄漏
    products.value = [];
});
</script>