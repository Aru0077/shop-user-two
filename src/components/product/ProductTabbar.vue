<template>
    <div class="h-[60px]">
        <div class="bg-gray-900 h-full w-full flex items-center justify-between">
            <div class="flex items-center h-[60px] gap-6 px-4">
                <!-- 收藏按钮 -->
                <div @click="toggleFavorite" class="cursor-pointer">
                    <Heart v-if="!isFavorite" :size="30" class="text-white" />
                    <Heart v-else :size="30" class="text-white fill-white" fill="white" />
                </div>
                <SquareArrowOutUpRight :size="30" class="text-white" />
            </div>

            <div class="flex items-center justify-center text-gray-900 font-bold p-4 box-border">
                <div class="h-[45px] bg-white rounded-l-lg flex items-center justify-center px-5 pt-2"
                    @click="emit('openCart')">
                    <ShoppingCartPlus badgeColor="#111827" :size="22" />
                </div>
                <div class="h-[45px] bg-white rounded-r-lg flex items-center justify-center px-5 text-[16px]"
                    @click="emit('openBuy')">
                    <Wallet class="mr-3" />
                    Buy now
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Heart, SquareArrowOutUpRight, Wallet } from 'lucide-vue-next';
import ShoppingCartPlus from '@/components/icon/ShoppingCartPlus.vue';
import type { ProductDetail } from '@/types/product.type';
import { useFavoriteStore } from '@/stores/favorite.store';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';

// 定义接收的props
const props = defineProps<{
    product: ProductDetail | null;
}>();

// 定义事件
const emit = defineEmits<{
    openCart: [];
    openBuy: [];
}>();

// 初始化store
const favoriteStore = useFavoriteStore();
const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

// 计算属性：是否已收藏
const isFavorite = computed(() => {
    if (!props.product?.id || !authStore.isLoggedIn) {
        return false;
    }
    return favoriteStore.isFavorite(props.product.id);
});

// 切换收藏状态
const toggleFavorite = async () => {
    // 如果产品不存在，直接返回
    if (!props.product?.id) return;

    // 检查用户登录状态
    if (!authStore.isLoggedIn) {
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
        return;
    }

    try {
        const productId = props.product.id;

        // 确保收藏store已初始化
        if (!favoriteStore.isInitialized()) {
            await favoriteStore.init();
        }

        if (isFavorite.value) {
            // 取消收藏
            await favoriteStore.removeFavorite(productId);

        } else {
            // 添加收藏
            await favoriteStore.addFavorite(productId);
        }
    } catch (error) {
        console.error('收藏操作失败:', error);
        toast.error('操作失败，请重试');
    }
};
</script>