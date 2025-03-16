<template>
    <div class="h-[60px]">
        <div class="bg-gray-900 h-full w-full flex items-center justify-between">
            <div class="flex items-center h-[60px] gap-6 px-4">
                <!-- 收藏按钮 -->
                <div @click="toggleFavorite" class="cursor-pointer">
                    <Heart v-if="!isLocalFavorite" :size="30" class="text-white" />
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
import { ref, watch, onMounted } from 'vue';
import { Heart, SquareArrowOutUpRight, Wallet } from 'lucide-vue-next';
import ShoppingCartPlus from '@/components/icon/ShoppingCartPlus.vue';
import type { ProductDetail } from '@/types/product.type';
import { useFavoriteStore } from '@/stores/favorite.store';
import { useUserStore } from '@/stores/user.store';
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
const userStore = useUserStore();
const router = useRouter();
const toast = useToast();

// 本地收藏状态 - 用于立即响应UI变化
const isLocalFavorite = ref(false);

// 在组件挂载时初始化
onMounted(async () => {
    // 如果用户已登录，则确保获取收藏列表
    if (userStore.isLoggedIn) {
        try {
            // 无论收藏 store 当前状态如何，都尝试确保有收藏 ID 数据
            if (!favoriteStore.isInitialized) {
                await favoriteStore.init();
            }
            
            // 如果初始化完成但没有收藏 ID，显式获取一次
            if (favoriteStore.isInitialized && favoriteStore.favoriteIds.length === 0) {
                await favoriteStore.fetchFavoriteIds();
            }
            
            // 设置初始收藏状态
            updateLocalFavoriteState();
        } catch (error) {
            console.error('初始化收藏状态失败:', error);
        }
    }
});
// 监听商品变化，更新本地收藏状态
watch(() => props.product, updateLocalFavoriteState, { immediate: true });

// 监听收藏IDs变化，更新本地收藏状态
watch(() => favoriteStore.favoriteIds, updateLocalFavoriteState);

// 更新本地收藏状态 
function updateLocalFavoriteState() {
    if (props.product && props.product.id && userStore.isLoggedIn) {
        // 确保读取最新的收藏状态
        isLocalFavorite.value = favoriteStore.isFavorite(props.product.id);
        console.log('商品收藏状态:', isLocalFavorite.value, '商品ID:', props.product.id);
    } else {
        isLocalFavorite.value = false;
    }
}

// 切换收藏状态 
const toggleFavorite = async () => {
    // 如果产品不存在，直接返回
    if (!props.product || !props.product.id) return;

    // 如果用户未登录，跳转到登录页
    if (!userStore.isLoggedIn) {
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
        return;
    }

    try {
        const productId = props.product.id;
        const wasLocalFavorite = isLocalFavorite.value;

        // 立即更新本地状态，提供即时反馈
        isLocalFavorite.value = !wasLocalFavorite;

        if (wasLocalFavorite) {
            // 取消收藏
            const success = await favoriteStore.removeFavorite(productId);
            if (success) {
                toast.success('已取消收藏');
            } else {
                // 恢复本地状态
                isLocalFavorite.value = true;
                toast.error('取消收藏失败，请重试');
            }
        } else {
            // 添加收藏
            const success = await favoriteStore.addFavorite({ productId });
            if (success) {
                toast.success('收藏成功');
            } else {
                // 恢复本地状态
                isLocalFavorite.value = false;
                toast.error('收藏失败，请重试');
            }
        }
    } catch (error) {
        console.error('收藏操作失败:', error);
        toast.error('操作失败，请重试');
        // 错误时恢复原始状态
        updateLocalFavoriteState();
    }
};
</script>