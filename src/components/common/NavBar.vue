<template>
    <nav class="h-[60px] flex justify-between items-center px-4 z-50 transition-colors duration-300 border-b "
        :class="{ 'bg-white/80 backdrop-blur-sm': navbarOptions.showBackground, 'bg-transparent': !navbarOptions.showBackground }">

        <!-- Left Button -->
        <div v-if="navbarOptions.leftButton"
            class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer"
            @click="handleLeftButtonClick">
            <img v-if="navbarOptions.leftButton === 'logo'"  :src="LogoIcon" alt="" class="w-6 h-6" /> 
            <ArrowLeft v-if="navbarOptions.leftButton === 'back'" class="w-6 h-6 text-black" />
            <Menu v-if="navbarOptions.leftButton === 'menu'" class="w-6 h-6 text-black" />
        </div>
        <div v-else class="w-10"></div>

        <!-- Right Button -->
        <div v-if="navbarOptions.rightButton"
            class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer"
            @click="handleRightButtonClick">
            <ShoppingCart v-if="navbarOptions.rightButton === 'cart'" class="w-6 h-6 text-black" />
            <Search v-if="navbarOptions.rightButton === 'search'" class="w-6 h-6 text-black" />
            <UserCircle v-if="navbarOptions.rightButton === 'user'" class="w-6 h-6 text-black" />
            <Settings v-if="navbarOptions.rightButton === 'settings'" class="w-6 h-6 text-black" />
        </div>
        <div v-else class="w-10"></div>
    </nav>
</template>

<script setup lang="ts">
import { computed} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    ShoppingCart,
    Search,
    UserCircle,
    Settings,
    ArrowLeft,
    Menu
} from 'lucide-vue-next';
import LogoIcon from '@/assets/logo.png';


interface NavbarOptions {
    leftButton?: string;
    rightButton?: string;
    showBackground: boolean;
}

// Get current route
const route = useRoute();
const router = useRouter();

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
            // router.push('/home');
            break;
        case 'back':
            router.back();
            break;
        case 'menu':
            // Handle menu click, e.g., emit event or toggle sidebar
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
        case 'search':
            // Handle search click, e.g., show search overlay
            break;
        case 'user':
            router.push('/profile');
            break;
        case 'settings':
            router.push('/settings');
            break;
        default:
            break;
    }
};
</script>
