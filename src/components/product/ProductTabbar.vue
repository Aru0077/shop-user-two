<template>
    <div class="h-[60px]">

        <div class=" bg-gray-900 h-full w-full  flex items-center justify-between">
            <div class="flex items-center h-[60px] gap-6 px-4">
                <!-- 修改收藏按钮，添加点击事件和条件样式 -->
                <div @click="toggleFavorite" class="cursor-pointer">
                    <Heart v-if="!isFavorited" :size="30" class="text-white" />
                    <Heart v-else :size="30" class="text-white fill-white" fill="white" />
                </div>
                <SquareArrowOutUpRight :size="30" class=" text-white" />
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
import { ref, inject, computed, onMounted } from 'vue';
import { Heart, SquareArrowOutUpRight, Wallet } from 'lucide-vue-next';
import ShoppingCartPlus from '@/components/icon/ShoppingCartPlus.vue';
import SkuSelector from '@/components/product/SkuSelector.vue';
import type { ProductDetail } from '@/types/product.type';

import { useFavoriteStore } from '@/stores/favorite.store';
import { useUserStore } from '@/stores/user.store';
import { useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';


// 注入父组件传递的产品数据
const product = inject < ProductDetail | null > ('product', null);

// SKU选择器状态 
const isSkuSelectorOpen = ref(false);
const selectorMode = ref < 'cart' | 'buy' > ('cart');

// 打开SKU选择器
const openSkuSelector = (mode: 'cart' | 'buy') => {
    selectorMode.value = mode;
    isSkuSelectorOpen.value = true;
};

// 获取收藏store
const favoriteStore = useFavoriteStore();
const userStore = useUserStore();
const router = useRouter();
const toast = useToast();

// 计算属性：判断当前商品是否已收藏
const isFavorited = computed(() => {
    if (!product || !product.id) return false;
    return favoriteStore.isFavorite(product.id);
});

// 在组件挂载时，如果用户已登录，获取收藏ID列表
onMounted(async () => {
    if (userStore.isLoggedIn && !favoriteStore.isInitialized) {
        await favoriteStore.fetchFavoriteIds();
    }
});

// 切换收藏状态
const toggleFavorite = async () => {
   
    
    // 如果产品不存在，直接返回
    if (!product || !product.id) return;
   
    // 如果用户未登录，跳转到登录页
    if (!userStore.isLoggedIn) {
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
        return;
    }
    
    try {
        if (isFavorited.value) {
            // 如果已收藏，则移除收藏
            // 立即更新UI状态
            const productId = product.id;
            
            // 先显示成功提示
            toast.success('已取消收藏');
            
            // 在后台发送请求
            favoriteStore.removeFavorite(productId).catch(() => {
                // 如果请求失败，恢复状态并提示重试
                toast.error('取消收藏失败，请重试');
            });
        } else {
            // 如果未收藏，则添加收藏
            const params = { productId: product.id };
            
            // 先显示成功提示
            toast.success('收藏成功');
            
            // 在后台发送请求
            favoriteStore.addFavorite(params).catch(() => {
                // 如果请求失败，恢复状态并提示重试
                toast.error('收藏失败，请重试');
            });
        }
    } catch (error) {
        console.error('收藏操作失败:', error);
        toast.error('操作失败，请重试');
    }
};


</script>