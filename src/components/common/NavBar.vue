<template>
    <nav class="h-[60px] flex justify-between items-center px-4 z-50 transition-colors duration-300 border-b "
        :class="{ 'bg-white/80 backdrop-blur-sm': navbarOptions.showBackground, 'bg-transparent': !navbarOptions.showBackground }">
        <!-- 导航栏内容保持不变 -->
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
            class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer"
            @click="handleRightButtonClick">
            <ShoppingCart v-if="navbarOptions.rightButton === 'cart'" class="w-6 h-6 text-black" />
            <FilePenLine v-if="navbarOptions.rightButton === 'edit'" class="w-6 h-6 text-black" />
            <Plus v-if="navbarOptions.rightButton === 'add'" class="w-6 h-6 text-black" />
        </div>
        <div v-else class="w-10"></div>
    </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    ShoppingCart,
    FilePenLine,
    ChevronLeft,
    Plus,
} from 'lucide-vue-next';
import LogoIcon from '@/assets/logo.png';
import { useAddressStore } from '@/stores/address.store';



interface NavbarOptions {
    leftButton?: string;
    rightButton?: string;
    showBackground: boolean;
}

// Get current route
const route = useRoute();
const router = useRouter();
const addressStore = useAddressStore();

// 计算属性
const addresses = computed(() => addressStore.addresses);



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

// Handle left button click
const handleLeftButtonClick = () => {
    switch (navbarOptions.value.leftButton) {
        case 'logo':
            break;
        case 'back':
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
