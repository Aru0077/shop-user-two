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
            <ProductTabbar 
                :product="product"
                @open-cart="openSkuSelector('cart')"
                @open-buy="openSkuSelector('buy')"
            />
        </div>

        <!-- SKU选择器 - 直接在父组件中引入并传递数据 -->
        <SkuSelector 
            :product="product" 
            :is-open="isSkuSelectorOpen" 
            :mode="selectorMode"
            @update:is-open="isSkuSelectorOpen = $event" 
        />
    </div>
</template>

<script setup lang="ts">
// 引入组件
import ProductNavbar from '@/components/product/ProductNavbar.vue';
import ProductDetailCard from '@/components/product/ProductDetailCard.vue';
import ProductTabbar from '@/components/product/ProductTabbar.vue';
import SkuSelector from '@/components/product/SkuSelector.vue';

// 引入方法和API
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useProductStore } from '@/stores/product.store';
import { ProductStatus } from '@/types/common.type';
import type { ApiError } from '@/types/common.type'
import type { ProductDetail } from '@/types/product.type';

// 为显示骨架屏配置空商品数据
const emptyProduct = ref<ProductDetail>({
    id: 0,
    categoryId: 0,
    name: "",
    content: null,
    mainImage: null,
    detailImages: [],
    is_promotion: 0,
    status: ProductStatus.DRAFT,
    productCode: "",
    salesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    skus: [],
    specs: [],
    validSpecCombinations: {},
    loadingSkus: true
});

// 从路由中获取商品id
const route = useRoute();
const productId = computed(() => Number(route.params.id));

// 使用商品状态管理
const productStore = useProductStore();

// 组件内部状态
const loading = ref(true);
const error = ref<string | null>(null);

// SKU选择器状态 - 在父组件中管理
const isSkuSelectorOpen = ref(false);
const selectorMode = ref<'cart' | 'buy'>('cart');

// 商品详情 - 将传递给子组件
const product = computed(() => productStore.currentProduct || emptyProduct.value);

// 打开SKU选择器
const openSkuSelector = (mode: 'cart' | 'buy') => {
    selectorMode.value = mode;
    isSkuSelectorOpen.value = true;
};

// 获取商品完整详情
const fetchProductData = async () => {
    if (!productId.value) return;

    // 避免重复请求同一商品
    if (product.value && product.value.id === productId.value) {
        return;
    }

    loading.value = true;
    error.value = null;

    try {
        await productStore.fetchProductFullDetail(productId.value);
    } catch (err) {
        error.value = (err as ApiError).message || '获取商品信息失败';
        console.error('获取商品信息失败:', err);
    } finally {
        loading.value = false;
    }
};

// 组件挂载时获取商品数据
onMounted(() => {
    fetchProductData();
});
</script>