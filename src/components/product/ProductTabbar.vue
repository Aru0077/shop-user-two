<template>
    <div class="h-[60px]">
        <div class="bg-gray-900 h-full w-full flex items-center justify-between">
            <div class="flex items-center h-[60px] gap-6 px-4">
                <!-- 收藏按钮 - 使用本地状态控制显示 -->
                <div @click="toggleFavorite" class="cursor-pointer">
                    <Heart v-if="!localFavoriteState" :size="30" class="text-white" />
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

// 使用本地状态来控制UI显示，以实现即时反馈
const localFavoriteState = ref(false);

// 当商品更新或者收藏状态变化时，更新本地状态
watch(() => [props.product, favoriteStore.favoriteIds], () => {
    updateLocalFavoriteState();
}, { immediate: true });

// 组件挂载时初始化本地收藏状态
onMounted(() => {
    updateLocalFavoriteState();
});

// 更新本地收藏状态
function updateLocalFavoriteState() {
    if (props.product?.id && userStore.isLoggedIn) {
        // 使用store的方法判断当前收藏状态
        localFavoriteState.value = favoriteStore.isFavorite(props.product.id);
    } else {
        localFavoriteState.value = false;
    }
}

// 切换收藏状态 - 采用乐观更新策略
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

    const productId = props.product.id;
    const originalState = localFavoriteState.value;
    
    // 立即更新UI状态 - 乐观更新
    localFavoriteState.value = !originalState;

    try {
        // 在后台执行实际的API请求
        let success: boolean;

        if (originalState) {
            // 原来是收藏状态，现在取消收藏
            success = await favoriteStore.removeFavorite(productId);
            if (success) {
                toast.success('已取消收藏');
            } else {
                // 操作失败，恢复原状态
                localFavoriteState.value = originalState;
                toast.error('取消收藏失败，请重试');
            }
        } else {
            // 原来不是收藏状态，现在添加收藏
            success = await favoriteStore.addFavorite({ productId });
            if (success) {
                toast.success('收藏成功');
            } else {
                // 操作失败，恢复原状态
                localFavoriteState.value = originalState;
                toast.error('收藏失败，请重试');
            }
        }
    } catch (error) {
        console.error('收藏操作失败:', error);
        // 发生错误，恢复原状态
        localFavoriteState.value = originalState;
        toast.error('操作失败，请重试');
    }
};
</script>