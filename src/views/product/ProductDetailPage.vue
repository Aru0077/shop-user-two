<template>
    <div class="flex flex-col overflow-hidden h-screen w-screen">
        <!-- 顶部导航和内容区域 -->
        <div class="flex-1 w-full relative">
            <div v-if="currentProduct">
                <!-- 内容区域 -->
                <div v-show="currentProduct" class="overflow-y-auto absolute top-0 left-0 right-0 bottom-[60px]">
                    <ProductDetailCard :product="currentProduct" />
                </div>
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

        <!-- SKU选择器 -->
        <SkuSelector :product="currentProduct" :is-open="isSkuSelectorOpen" :mode="selectorMode"
            @update:is-open="isSkuSelectorOpen = $event" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useProductStore } from '@/stores/product.store';
import { useToast } from '@/composables/useToast';
import type { ProductDetail } from '@/types/product.type';

// 引入组件
import ProductNavbar from '@/components/product/ProductNavbar.vue';
import ProductDetailCard from '@/components/product/ProductDetailCard.vue';
import ProductTabbar from '@/components/product/ProductTabbar.vue';
import SkuSelector from '@/components/product/SkuSelector.vue';

// 初始化store和工具
const route = useRoute();
const productStore = useProductStore();
const toast = useToast();

// 状态定义
const currentProduct = ref<ProductDetail | null>(null);
const isSkuSelectorOpen = ref(false);
const selectorMode = ref<'cart' | 'buy'>('cart');

// 从路由参数获取商品ID
const productId = computed(() => Number(route.params.id));

// 加载状态计算属性
const isLoading = computed(() => productStore.loading);

// 打开SKU选择器
const openSkuSelector = (mode: 'cart' | 'buy') => {
    if (!currentProduct.value) {
        toast.warning('商品信息不完整，请稍后再试');
        return;
    }

    selectorMode.value = mode;
    isSkuSelectorOpen.value = true;
};

// 获取商品详情数据
const fetchProductDetail = async () => {
    if (!productId.value) return;

    try {
        // 使用productStore加载商品详情
        const product = await productStore.getProductDetail(productId.value);

        if (product) {
            currentProduct.value = product;
        } else {
            toast.error('获取商品详情失败');
        }
    } catch (error) {
        console.error('获取商品详情错误:', error);
        toast.error('获取商品详情失败，请重试');
    }
};

// 监听商品ID变化，重新获取商品详情
watch(() => productId.value, (newId) => {
    if (newId) {
        fetchProductDetail();
    }
}, { immediate: true });

// 组件挂载时初始化
onMounted(async () => {
    // 确保productStore已初始化
    if (!productStore.isInitialized()) {
        await productStore.init();
    }

    // 有商品ID参数时获取商品详情
    if (productId.value) {
        fetchProductDetail();
    }
});
</script>