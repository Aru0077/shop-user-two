<template>
    <div class="flex flex-col overflow-hidden h-screen w-screen">
        <!-- 顶部导航和内容区域 -->
        <div class="flex-1 w-full relative">
            <!-- 内容区域 -->
            <div v-show="currentProduct" class="overflow-y-auto absolute top-0 left-0 right-0 bottom-[60px]">
                <ProductDetailCard :product="currentProduct" />
            </div>
            <!-- 顶部导航栏 -->
            <div class="fixed top-0 left-0 right-0 h-[60px] w-full z-20 bg-transparent box-border">
                <ProductNavbar :loading="isLoading" />
            </div>
        </div>

        <!-- 底部操作区 -->
        <div class="fixed bottom-0 left-0 right-0 h-[60px] w-full z-50 box-border">
            <ProductTabbar :product="currentProduct" @open-cart="openSkuSelector('cart')"
                @open-buy="openSkuSelector('buy')" />
        </div>

        <!-- SKU选择器 - 直接在父组件中引入并传递数据 -->
        <SkuSelector :product="currentProduct" :is-open="isSkuSelectorOpen" :mode="selectorMode"
            @update:is-open="isSkuSelectorOpen = $event" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user.store';
import { useProductStore } from '@/stores/product.store';
import { useFavoriteStore } from '@/stores/favorite.store';
import { useCartStore } from '@/stores/cart.store';
import { toast } from '@/utils/toast.service';
import { ProductStatus } from '@/types/common.type';
import type { ProductDetail } from '@/types/product.type';

// 引入组件
import ProductNavbar from '@/components/product/ProductNavbar.vue';
import ProductDetailCard from '@/components/product/ProductDetailCard.vue';
import ProductTabbar from '@/components/product/ProductTabbar.vue';
import SkuSelector from '@/components/product/SkuSelector.vue';

// 为显示骨架屏配置空商品数据
const emptyProduct: ProductDetail = {
    id: 0,
    categoryId: 0,
    name: "",
    status: ProductStatus.DRAFT,
    productCode: "",
    createdAt: "",
    updatedAt: "",
    specs: [],
    validSpecCombinations: {},
    loadingSkus: true,
    skus: []
};

// 从路由中获取商品id
const route = useRoute();
const productId = computed(() => Number(route.params.id));

// 使用状态管理
const productStore = useProductStore();
const userStore = useUserStore();
const favoriteStore = useFavoriteStore();
const cartStore = useCartStore();

// 状态
const currentProduct = ref<ProductDetail>(emptyProduct);

// 是否正在加载
const isLoading = computed(() => productStore.loadingProductDetail);

// SKU选择器状态
const isSkuSelectorOpen = ref(false);
const selectorMode = ref<'cart' | 'buy'>('cart');

// 打开SKU选择器
const openSkuSelector = (mode: 'cart' | 'buy') => {
    // 检查商品是否有效
    if (!currentProduct.value || currentProduct.value.id === 0) {
        toast.warning('商品信息不完整，请稍后再试');
        return;
    }

    // 检查商品状态
    if (currentProduct.value.status !== ProductStatus.ONLINE) {
        toast.warning('商品当前不可购买');
        return;
    }

    selectorMode.value = mode;
    isSkuSelectorOpen.value = true;
};

// 获取商品详情
const fetchProductDetail = async (forceRefresh = false) => {
    if (!productId.value) return;

    // 先重置为空商品，显示加载状态
    currentProduct.value = emptyProduct;

    try {
        const productDetail = await productStore.getProductDetail(productId.value, forceRefresh);
        if (productDetail) {
            currentProduct.value = productDetail;
        }
    } catch (err) {
        console.error('获取商品详情失败:', err);
        toast.error('获取商品详情失败，请重试');
    }
};

// 监听商品ID变化
watch(() => productId.value, (newId, oldId) => {
    if (newId && newId !== oldId) {
        fetchProductDetail();
    }
}, { immediate: true });

// 初始化stores
const initializeStores = async () => {
    try {
        // 检查并初始化必要的stores
        if (!productStore.isInitialized()) {
            await productStore.init();
        }

        if (!userStore.isInitialized()) {
            await userStore.init();
        }

        // 如果用户已登录，确保收藏和购物车store已初始化
        if (userStore.isLoggedIn) {
            if (!favoriteStore.isInitialized()) {
                await favoriteStore.init();
            }

            if (!cartStore.isInitialized()) {
                await cartStore.init();
            }
        }
    } catch (error) {
        console.error('初始化stores失败:', error);
        toast.error('初始化失败，请刷新页面重试');
    }
};

// 组件挂载时初始化
onMounted(async () => {
    // 初始化必要的stores
    await initializeStores();

    // 获取商品详情
    if (productId.value) {
        fetchProductDetail();
    }
});

// 组件卸载前清理资源
onUnmounted(() => {
    // 恢复为emptyProduct
    currentProduct.value = emptyProduct;
});

// 刷新商品数据
const refreshProductData = () => {
    if (productId.value) {
        fetchProductDetail(true); // 强制刷新
    }
};


</script>