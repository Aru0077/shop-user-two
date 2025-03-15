<template>
    <div class="h-[60px]">
        <div class="bg-gray-900 h-full w-full flex items-center justify-between">
            <div class="flex items-center h-[60px] gap-6 px-4">
                <!-- 修改收藏按钮，添加点击事件和条件样式 -->
                <div @click="toggleFavorite" class="cursor-pointer">
                    <Heart v-if="!isLocalFavorite" :size="30" class="text-white" />
                    <Heart v-else :size="30" class="text-white fill-white" fill="white" />
                </div>
                <SquareArrowOutUpRight :size="30" class="text-white" />
            </div>

            <div class="flex items-center justify-center text-gray-900 font-bold p-4 box-border">
                <div class="h-[45px] bg-white rounded-l-lg flex items-center justify-center px-5 pt-2"
                    @click="openSkuSelector('cart')">
                    <ShoppingCartPlus badgeColor="#111827" :size="22" />
                </div>
                <div class="h-[45px] bg-white rounded-r-lg flex items-center justify-center px-5 text-[16px]"
                    @click="openSkuSelector('buy')">
                    <Wallet class="mr-3" />
                    Buy now
                </div>
            </div>
        </div>

        <!-- SKU 选择器 -->
        <SkuSelector :product="product" :is-open="isSkuSelectorOpen" :mode="selectorMode"
            @update:is-open="isSkuSelectorOpen = $event" />
    </div>
</template>

<script setup lang="ts">
import { ref, inject, watch, onMounted, computed } from 'vue';
import { Heart, SquareArrowOutUpRight, Wallet } from 'lucide-vue-next';
import ShoppingCartPlus from '@/components/icon/ShoppingCartPlus.vue';
import SkuSelector from '@/components/product/SkuSelector.vue';
import type { ProductDetail } from '@/types/product.type';
import { useFavoriteStore } from '@/stores/favorite.store';
import { useUserStore } from '@/stores/user.store';
import { useRoute, useRouter } from 'vue-router';
import { useProductStore } from '@/stores/product.store';
import { useToast } from '@/composables/useToast';

// 初始化 store
const route = useRoute();
const productStore = useProductStore();

// 从路由中获取id
const productId = computed(() => Number(route.params.id));

// 直接从store获取产品数据
const productData = computed(() => productStore.currentProduct);


// 注入父组件传递的产品数据
const product = inject<ProductDetail | null>('product', null);

// SKU选择器状态 
const isSkuSelectorOpen = ref(false);
const selectorMode = ref<'cart' | 'buy'>('cart');

// 获取收藏store
const favoriteStore = useFavoriteStore();
const userStore = useUserStore();
const router = useRouter();
const toast = useToast();

// 本地收藏状态 - 用于立即响应UI变化
const isLocalFavorite = ref(false);

// 在组件挂载时初始化
onMounted(async () => {
    // 如果用户已登录
    if (userStore.isLoggedIn) {
        // 如果收藏store未初始化，先初始化
        if (!favoriteStore.isInitialized && !favoriteStore.isInitializing) {
            await favoriteStore.init();
        } 
        // 如果收藏IDs未获取，获取收藏IDs
        else if (favoriteStore.isInitialized && favoriteStore.favoriteIds.length === 0) {
            await favoriteStore.fetchFavoriteIds();
        }
        
        // 设置初始收藏状态
        updateLocalFavoriteState();
    }
});

// 监听商品变化，更新本地收藏状态
watch(() => product, updateLocalFavoriteState, { immediate: true });

// 监听收藏IDs变化，更新本地收藏状态
watch(() => favoriteStore.favoriteIds, updateLocalFavoriteState);

// 更新本地收藏状态
function updateLocalFavoriteState() {
    if (product && product.id && userStore.isLoggedIn) {
        isLocalFavorite.value = favoriteStore.isFavorite(product.id);
    } else {
        isLocalFavorite.value = false;
    }
}

// 切换收藏状态
const toggleFavorite = async () => {

    console.log("ProductTabbar mounted, product:", product?.id);
    console.log("User logged in:", userStore.isLoggedIn);

    // 如果产品不存在，直接返回
    if (!product || !product.id) return;
   console.log("User logged in:", 22222);
    // 如果用户未登录，跳转到登录页
    if (!userStore.isLoggedIn) {
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
        return;
    }
    
    try {
        const productId = product.id;
        const wasLocalFavorite = isLocalFavorite.value;
        
        // 立即更新本地状态，提供即时反馈
        isLocalFavorite.value = !wasLocalFavorite;
        
        if (wasLocalFavorite) {
            // 如果已收藏，则取消收藏
            toast.success('已取消收藏');
            
            // 在后台发送请求
            favoriteStore.removeFavorite(productId).catch(() => {
                // 如果请求失败，恢复本地状态
                isLocalFavorite.value = true;
                toast.error('取消收藏失败，请重试');
            });
        } else {
            // 如果未收藏，则添加收藏
            toast.success('收藏成功');
            
            // 在后台发送请求
            favoriteStore.addFavorite({ productId }).catch(() => {
                // 如果请求失败，恢复本地状态
                isLocalFavorite.value = false;
                toast.error('收藏失败，请重试');
            });
        }
    } catch (error) {
        console.error('收藏操作失败:', error);
        toast.error('操作失败，请重试');
    }
};

// 打开SKU选择器
const openSkuSelector = (mode: 'cart' | 'buy') => {
    selectorMode.value = mode;
    isSkuSelectorOpen.value = true;
};
</script>