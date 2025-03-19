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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user.store';
import { useProductStore } from '@/stores/product.store';
import { useFavoriteStore } from '@/stores/favorite.store';
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
    loadingSkus: true
};

// 从路由中获取商品id
const route = useRoute();
const productId = computed(() => Number(route.params.id));

// 使用状态管理
const productStore = useProductStore();
const userStore = useUserStore();
const favoriteStore = useFavoriteStore();

// 状态
const loading = ref(true);
const product = ref<ProductDetail>(emptyProduct);

// SKU选择器状态
const isSkuSelectorOpen = ref(false);
const selectorMode = ref<'cart' | 'buy'>('cart');

// 打开SKU选择器
const openSkuSelector = (mode: 'cart' | 'buy') => {
    selectorMode.value = mode;
    isSkuSelectorOpen.value = true;
};

// 获取商品详情
const fetchProductDetail = async () => {
    if (!productId.value) return;
    
    loading.value = true;
    
    try {
        const productDetail = await productStore.getProductDetail(productId.value);
        if (productDetail) {
            product.value = productDetail;
        }
        // 如果productDetail为null，保持emptyProduct不变
    } catch (err) {
        console.error('获取商品详情失败:', err);
        // 出错时product仍然是emptyProduct
    } finally {
        loading.value = false;
    }
};

// 监听商品ID变化
watch(() => productId.value, (newProductId) => {
    if (newProductId) {
        fetchProductDetail();
    }
}, { immediate: true });

// 组件挂载时初始化
onMounted(async () => {
    // 确保store已初始化
    await Promise.all([
        productStore.init(),
        userStore.init()
    ]);
    
    // 如果用户已登录，初始化收藏store
    if (userStore.isLoggedIn) {
        await favoriteStore.init();
    }
    
    // 获取商品详情
    fetchProductDetail();
});

// 组件卸载前清理资源
// 修改onUnmounted
onUnmounted(() => {
    // 恢复为emptyProduct而不是设为null
    product.value = emptyProduct;
});
</script>