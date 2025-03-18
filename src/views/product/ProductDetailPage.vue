<template>
    <div class="flex flex-col overflow-hidden h-screen w-screen">
        <!-- 顶部导航和内容区域 -->
        <div class="flex-1 w-full relative">
            <!-- 内容区域 -->
            <div v-show="product" class="overflow-y-auto absolute top-0 left-0 right-0 bottom-[60px]">
                <ProductDetailCard :product="product" />
            </div>
            <!-- 顶部导航栏 -->
            <div class="fixed top-0 left-0 right-0 h-[60px] w-full z-20 bg-transparent box-border">
                <ProductNavbar />
            </div>
        </div>

        <!-- 底部操作区 -->
        <div class="fixed bottom-0 left-0 right-0 h-[60px] w-full z-50 box-border">
            <ProductTabbar :product="product" @open-cart="openSkuSelector('cart')" @open-buy="openSkuSelector('buy')" />
        </div>

        <!-- SKU选择器 - 直接在父组件中引入并传递数据 -->
        <SkuSelector :product="product" :is-open="isSkuSelectorOpen" :mode="selectorMode"
            @update:is-open="isSkuSelectorOpen = $event" />
    </div>
</template>

<script setup lang="ts">
// 引入组件
import ProductNavbar from '@/components/product/ProductNavbar.vue';
import ProductDetailCard from '@/components/product/ProductDetailCard.vue';
import ProductTabbar from '@/components/product/ProductTabbar.vue';
import SkuSelector from '@/components/product/SkuSelector.vue';

// 引入方法和API
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user.store';
import { useProductStore } from '@/stores/product.store';
import { useFavoriteStore } from '@/stores/favorite.store';
import { ProductStatus } from '@/types/common.type';
import type { ProductDetail } from '@/types/product.type';

// 为显示骨架屏配置空商品数据
const emptyProduct = ref<ProductDetail>({
    id: 0,
    categoryId: 0,
    name: "",
    status: ProductStatus.DRAFT,
    productCode: "",
    createdAt: "",
    updatedAt: "",
    specs: [],
    validSpecCombinations: {},
    loadingSkus: true
});

// 从路由中获取商品id
const route = useRoute();
const productId = computed(() => Number(route.params.id));

// 使用状态管理
const productStore = useProductStore();
const userStore = useUserStore();
const favoriteStore = useFavoriteStore();

// SKU选择器状态 - 在父组件中管理
const isSkuSelectorOpen = ref(false);
const selectorMode = ref<'cart' | 'buy'>('cart');

// 使用计算属性获取当前商品，利用store的缓存机制
const product = computed(() => {
    // 如果商品ID为0或无效，返回空商品
    if (!productId.value) return emptyProduct.value;

    // 检查是否有缓存的正在加载状态
    const isLoading = productStore.loading;

    // 如果当前正在加载此商品，返回空商品但保持loading状态
    if (isLoading) {
        return { ...emptyProduct.value, id: productId.value, loadingSkus: true };
    }

    // 通过currentProduct获取商品（如果currentProductId匹配）
    if (productStore.currentProductId === productId.value && productStore.currentProduct) {
        return productStore.currentProduct;
    }

    // 尝试从缓存中获取商品
    const cachedProduct = productStore.isProductInCache && productStore.isProductInCache(productId.value)
        ? productStore.getProductFromCache(productId.value)
        : null;

    if (cachedProduct) {
        return cachedProduct;
    }

    // 如果都没有，返回空商品
    return emptyProduct.value;
});

// 商品加载状态
const loading = computed(() => productStore.loading);

// 错误状态
// const error = computed(() => productStore.error);

// 打开SKU选择器
const openSkuSelector = (mode: 'cart' | 'buy') => {
    selectorMode.value = mode;
    isSkuSelectorOpen.value = true;
};

// 获取商品完整详情
const fetchProductData = async () => {
    if (!productId.value) return;

    try {
        // 确保 productStore 已初始化2
        if (!productStore.isInitialized && !productStore.isInitializing) {
            await productStore.init();
        }

        // 检查商品是否已在缓存中且有完整数据
        const isCached = productStore.isProductInCache && productStore.isProductInCache(productId.value);
        let hasCompleteData = false;

        if (isCached && productStore.getProductFromCache) {
            const cachedProduct = productStore.getProductFromCache(productId.value);
            hasCompleteData = !!(cachedProduct &&
                cachedProduct.skus &&
                cachedProduct.skus.length > 0 &&
                !cachedProduct.loadingSkus);
        }

        // 如果已有完整数据且未加载中，只需更新当前商品ID
        if (hasCompleteData && !loading.value) {
            productStore.currentProductId = productId.value;
            return;
        }

        // 否则，获取完整商品详情
        await productStore.fetchProductFullDetail(productId.value);
    } catch (err) {
        console.error('获取商品信息失败:', err);
    }
};

// 监听商品ID变化
watch(() => route.params.id, () => {
    const newProductId = Number(route.params.id);
    if (newProductId) {
        // 更新当前查看的商品ID
        productStore.currentProductId = newProductId;
        fetchProductData();
    }
}, { immediate: true });

// 组件挂载时初始化数据
onMounted(async () => {
    // 确保收藏状态已初始化
    if (userStore.isLoggedIn && !favoriteStore.isInitialized) {
        await favoriteStore.init();
    }

    // 预加载最近浏览商品
    if (productStore.recentProducts?.length > 0 && productStore.prefetchProductDetails) {
        productStore.prefetchProductDetails(productStore.recentProducts);
    }
});

// 组件卸载前清理资源
onBeforeUnmount(() => {
    // 不再需要显式设置currentProduct = null，
    // 因为store中已经使用currentProductId来追踪当前商品
    if (productStore.dispose) {
        productStore.dispose();
    }
});
</script>