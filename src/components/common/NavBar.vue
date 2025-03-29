<template>
    <nav class="h-[60px] flex justify-between items-center px-4 z-50 transition-colors duration-300 border-b"
        :class="{ 'bg-[#FEFEFE] backdrop-blur-sm': navbarOptions.showBackground, 'bg-transparent': !navbarOptions.showBackground }">
        <!-- 左侧按钮 Button -->
        <div v-if="navbarOptions.leftButton"
            class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer"
            @click="handleLeftButtonClick">
            <img v-if="navbarOptions.leftButton === 'logo'" :src="LogoIcon" alt="" class="w-6 h-6" />
            <ChevronLeft v-if="navbarOptions.leftButton === 'back'" class="w-6 h-6 text-black" />
        </div>

        <div v-else class="w-10"></div>

        <!-- 右侧按钮 Button -->
        <div v-if="navbarOptions.rightButton"
            class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer relative"
            @click="handleRightButtonClick">
            <!-- 购物车图标 -->
            <ShoppingCart v-if="navbarOptions.rightButton === 'cart'" class="w-6 h-6 text-black" />
            <!-- 购物车数量角标 - 添加动画效果 -->
            <transition name="badge-pop">
                <span v-if="navbarOptions.rightButton === 'cart' && displayCartCount > 0"
                    class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center px-1 transform origin-center">
                    {{ displayCartCount > 99 ? '99+' : displayCartCount }}
                </span>
            </transition>
            <FilePenLine v-if="navbarOptions.rightButton === 'edit'" class="w-6 h-6 text-black" />
            <Plus v-if="navbarOptions.rightButton === 'add'" class="w-6 h-6 text-black" />
        </div>
        <div v-else class="w-10"></div>
    </nav>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    ShoppingCart,
    FilePenLine,
    ChevronLeft,
    Plus,
} from 'lucide-vue-next';
import LogoIcon from '@/assets/logo.png';
import { useAddressStore } from '@/stores/address.store';
import { useCartStore } from '@/stores/cart.store';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';

interface NavbarOptions {
    leftButton?: string;
    rightButton?: string;
    showBackground: boolean;
}

// Get current route
const route = useRoute();
const router = useRouter();
const addressStore = useAddressStore();
const cartStore = useCartStore();

// 创建一个独立的响应式变量跟踪购物车数量
// 使用ref而不是computed，以便我们可以直接更新它
const displayCartCount = ref(0);

// 更新显示的购物车数量
const updateCartCount = () => {
    displayCartCount.value = cartStore.totalCount;
};

// 计算属性
const addresses = computed(() => addressStore.addresses);
const cartItemCount = computed(() => cartStore.totalCount);

// 监听cartItemCount的变化并更新displayCartCount
const updateDisplayCartCount = () => {
    displayCartCount.value = cartItemCount.value;
};

// Default navbar options
const defaultNavbarOptions: NavbarOptions = {
    leftButton: undefined,
    rightButton: undefined,
    showBackground: true
};

// Computed navbar options from route meta
const navbarOptions = computed<NavbarOptions>(() => {
    const routeNavbar = route.meta.navbar as NavbarOptions || {};
    return {
        ...defaultNavbarOptions,
        ...routeNavbar
    };
});

// 监听购物车事件
const setupCartEventListeners = () => {
    // 监听购物车更新事件
    eventBus.on(EVENT_NAMES.CART_UPDATED, updateCartCount);

    // 监听商品添加事件
    eventBus.on(EVENT_NAMES.CART_ITEM_ADDED, updateCartCount);

    // 监听商品删除事件
    eventBus.on(EVENT_NAMES.CART_ITEM_DELETED, updateCartCount);

    // 监听商品更新事件
    eventBus.on(EVENT_NAMES.CART_ITEM_UPDATED, updateCartCount);
};

// 清理事件监听
const cleanupCartEventListeners = () => {
    eventBus.off(EVENT_NAMES.CART_UPDATED, updateCartCount);
    eventBus.off(EVENT_NAMES.CART_ITEM_ADDED, updateCartCount);
    eventBus.off(EVENT_NAMES.CART_ITEM_DELETED, updateCartCount);
    eventBus.off(EVENT_NAMES.CART_ITEM_UPDATED, updateCartCount);
};

// 组件挂载时设置事件监听
onMounted(() => {
    // 初始化显示数量
    updateDisplayCartCount();

    // 设置事件监听
    setupCartEventListeners();
});

// 组件卸载时清理事件监听
onUnmounted(() => {
    cleanupCartEventListeners();
});

// Handle left button click
const handleLeftButtonClick = () => {
    switch (navbarOptions.value.leftButton) {
        case 'logo':
            break;
        case 'back':
            // 处理结账页面返回逻辑
            if (route.path === '/checkout') {
                // 安全获取路由历史 - 使用类型安全的方式
                const previousPath = router.currentRoute.value.fullPath;
                const fromAddress = previousPath.includes('/address');
                
                // 获取临时订单ID
                const tempOrderId = route.query.tempOrderId;
                
                // 判断上一个路由是否为地址页面
                if (fromAddress) {
                    // 如果是从地址页返回，并且存在历史记录 
                    
                    // 根据是否有tempOrderId决定返回到哪里
                    if (tempOrderId) {
                        // 有临时订单，可能是从购物车来的
                        router.push('/cart');
                    } else {
                        // 默认返回购物车
                        router.push('/cart');
                    }
                    return;
                }
            }

            // 检查是否在地址列表页，且带有特定标记
            if (route.path === '/address' && route.query.from === 'editor') {
                // 清除查询参数，避免影响下次访问
                const { from, ...otherQuery } = route.query;

                // 直接导航到个人中心页面或应用首页
                router.replace({
                    path: '/profile',  // 或其他合适的返回页面，如'/home'
                    query: otherQuery
                });
            } else {
                // 正常的返回操作
                router.back();
            }
            break;

        default:
            break;
    }
};

// Handle right button click
const handleRightButtonClick = () => {
    switch (navbarOptions.value.rightButton) {
        case 'cart':
            router.push('/cart');
            break;
        case 'add':
            if (addresses.value.length < 10) {
                router.push('/new-address');
            }
            break;

        default:
            break;
    }
};
</script>

<style scoped>
/* 添加角标弹出动画 */
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