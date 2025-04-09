<template>
    <div class="h-[60px] w-full flex justify-between items-center px-4 z-50 transition-colors duration-300 box-border">
        <!-- 左侧按钮 -->
        <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center cursor-pointer">
            <ArrowLeft class="w-6 h-6 text-black" @click="goBack" />
        </div>

        <!-- 右侧按钮 -->
        <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center cursor-pointer relative">
            <ShoppingCart class="w-6 h-6 text-black" @click="goCart" />
            <!-- 购物车数量角标 -->
            <transition name="badge-pop">
                <span v-if="cartItemCount > 0"
                    class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center px-1 transform origin-center">
                    {{ displayCartCount }}
                </span>
            </transition>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { ArrowLeft, ShoppingCart } from 'lucide-vue-next'
import { useRouter } from 'vue-router';
import { useCartStore } from '@/stores/cart.store';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { useAuthStore } from '@/stores/auth.store';

// 定义组件属性
defineProps({
    loading: {
        type: Boolean,
        default: false
    }
});

const router = useRouter();
const cartStore = useCartStore();
const authStore = useAuthStore();

// 购物车数量计算属性
const cartItemCount = computed(() => cartStore.totalCount);

// 显示的购物车数量
const displayCartCount = computed(() => {
    return cartItemCount.value > 99 ? '99+' : cartItemCount.value;
});

// 更新购物车数量
const updateCartCount = () => {
    // 只有在用户已登录的情况下才初始化购物车
    if (authStore.isLoggedIn) {
        // 确保购物车store已初始化
        if (!cartStore.isInitialized()) {
            cartStore.init();
        }
    }
};

// 监听购物车事件
const setupCartEventListeners = () => {
    eventBus.on(EVENT_NAMES.CART_UPDATED, updateCartCount);
    eventBus.on(EVENT_NAMES.CART_ITEM_ADDED, updateCartCount);
    eventBus.on(EVENT_NAMES.CART_ITEM_DELETED, updateCartCount);
    eventBus.on(EVENT_NAMES.CART_ITEM_UPDATED, updateCartCount);
};

// 清理事件监听
const cleanupCartEventListeners = () => {
    eventBus.off(EVENT_NAMES.CART_UPDATED, updateCartCount);
    eventBus.off(EVENT_NAMES.CART_ITEM_ADDED, updateCartCount);
    eventBus.off(EVENT_NAMES.CART_ITEM_DELETED, updateCartCount);
    eventBus.off(EVENT_NAMES.CART_ITEM_UPDATED, updateCartCount);
};

// 组件挂载时初始化
onMounted(() => {
    updateCartCount();
    setupCartEventListeners();
});

// 组件卸载时清理
onUnmounted(() => {
    cleanupCartEventListeners();
});

// 返回上一页
const goBack = () => {
    router.back();
};

// 跳转购物车
const goCart = () => {
    router.push('/cart');
};
</script>

<style scoped>
/* 角标弹出动画 */
.badge-pop-enter-active,
.badge-pop-leave-active {
    transition: all 0.3s ease;
}

.badge-pop-enter-from {
    opacity: 0;
    transform: scale(0.5) translateY(10px);
}

.badge-pop-leave-to {
    opacity: 0;
    transform: scale(0.5) translateY(-10px);
}
</style>