<template>
    <div class="flex flex-col overflow-hidden h-full p-4">
        <!-- 页面标题 -->
        <PageTitle :mainTitle="pageTitle" class="z-10" />

        <div class="flex-1 overflow-y-auto">
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

    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
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
const loading = ref(false);
const loadingMore = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);
const hasMore = ref(true);

// 列表类型和标题
const listType = computed(() => route.params.type as string);

// 添加搜索关键词状态
const keyword = ref('');

// 页面标题处理
const pageTitle = computed(() => {
    switch (listType.value) {
        case 'latest':
            return 'New Arrivals';
        case 'topselling':
            return 'Best Sellers';
        case 'promotion':
            return 'On Sale';
        case 'search':
            return `Search: ${keyword.value}`;
        default:
            // 处理分类商品显示
            if (listType.value?.startsWith('category-')) {
                const categoryId = Number(listType.value.split('-')[1]);
                const category = findCategory(categoryId);
                return category?.name || '分类商品';
            }
            return '商品列表';
    }
});

// 根据ID查找分类
const findCategory = (categoryId: number) => {
    // 先在顶级分类中查找
    let category = productStore.categories.find(c => c.id === categoryId);
    if (category) return category;

    // 在子分类中查找
    for (const parentCategory of productStore.categories) {
        if (parentCategory.children) {
            const subCategory = parentCategory.children.find(c => c.id === categoryId);
            if (subCategory) return subCategory;
        }
    }

    return null;
};

// 加载商品列表
const loadProducts = async (isLoadMore = false) => {
    try {
        if (isLoadMore) {
            loadingMore.value = true;
        } else {
            loading.value = true;
            // 只有首次加载或切换类型时重置产品列表
            products.value = [];
        }

        let response: PaginatedResponse<Product> | null = null;

        // 根据列表类型获取不同商品数据
        switch (listType.value) {
            case 'latest':
                response = await productStore.getLatestProducts(currentPage.value, pageSize.value);
                break;
            case 'topselling':
                response = await productStore.getTopSellingProducts(currentPage.value, pageSize.value);
                break;
            case 'promotion':
                response = await productStore.getPromotionProducts(currentPage.value, pageSize.value);
                break;
            case 'search':
                // 确保关键词不为空
                if (keyword.value && keyword.value.trim() !== '') {
                    const searchResponse = await productStore.searchProducts({
                        keyword: keyword.value.trim(), // 确保提供有效的关键词
                        page: currentPage.value,
                        limit: pageSize.value
                    });
                    response = searchResponse;
                } else {
                    // 不调用API，而是显示提示
                    toast.warning('请输入搜索关键词');
                }
                break;
            default:
                if (listType.value?.startsWith('category-')) {
                    const categoryId = Number(listType.value.split('-')[1]);
                    response = await productStore.getCategoryProducts(
                        categoryId,
                        currentPage.value,
                        pageSize.value
                    );
                }
        }

        if (response) {
            // 更新产品列表数据
            if (isLoadMore) {
                products.value = [...products.value, ...response.data];
            } else {
                products.value = response.data;
            }

            // 判断是否还有更多数据
            hasMore.value = response.data.length >= pageSize.value;
        }
    } catch (error) {
        console.error('加载商品列表失败:', error);
        toast.error('加载商品失败，请重试');
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
};

// 加载更多商品
const loadMore = async () => {
    if (loadingMore.value || !hasMore.value) return;

    currentPage.value++;
    await loadProducts(true);
};

// 重置并重新加载
const resetAndLoad = () => {
    currentPage.value = 1;
    hasMore.value = true;
    loadProducts();
};

// 返回首页
const goToHome = () => {
    router.push('/home');
};

// 监听路由变化，切换不同类型的列表
watch(() => route.params.type, () => {
    resetAndLoad();
});

// 监听路由变化，获取搜索关键词
// 监听路由查询参数的变化，获取搜索关键词 - 添加到组件的watch部分
watch(() => route.query.keyword, (newKeyword) => {
    if (newKeyword && typeof newKeyword === 'string') {
        keyword.value = newKeyword;
    } else {
        keyword.value = '';
    }

    // 如果是搜索类型，则重新加载
    if (listType.value === 'search') {
        resetAndLoad();
    }
}, { immediate: true });

// 组件挂载时初始化
onMounted(async () => {
    // 确保productStore已初始化
    if (!productStore.isInitialized()) {
        await productStore.init();
    }

    // 如果是分类列表但分类数据为空，获取分类树
    if (listType.value?.startsWith('category-') && productStore.categories.length === 0) {
        await productStore.getCategoryTree();
    }

    // 加载产品列表
    resetAndLoad();
});
</script>