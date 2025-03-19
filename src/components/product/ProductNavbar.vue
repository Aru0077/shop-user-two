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
                <span v-if="displayCartCount > 0"
                    class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center px-1 transform origin-center">
                    {{ displayCartCount > 99 ? '99+' : displayCartCount }}
                </span>
            </transition>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ArrowLeft, ShoppingCart } from 'lucide-vue-next'
import { useRouter } from 'vue-router';
import { useCartStore } from '@/stores/cart.store';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';

const router = useRouter();
const cartStore = useCartStore();

// 创建响应式变量跟踪购物车数量
const displayCartCount = ref(0);

// 更新显示的购物车数量
const updateCartCount = () => {
    displayCartCount.value = cartStore.cartItemCount;
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
    // 初始化显示数量
    updateCartCount();
    
    // 设置事件监听
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