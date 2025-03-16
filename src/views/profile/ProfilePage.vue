<template>
    <div class="pageContent">
        <!-- 页面标题 -->
        <PageTitle mainTitle="Profile" />

        <!-- 间距 占位符 -->
        <div class="w-full h-4"></div>

        <div>
            <!-- 用户名 -->
            <div class="bg-white p-5 rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.08)] mb-4">
                <div class="flex items-center">
                    <div
                        class="relative flex items-center justify-center w-16 h-16 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.08)] ">
                        <img :src="logoImg" alt="Logo" class="w-12 h-12 object-contain" />
                    </div>

                    <div class="ml-4 flex-1">
                        <div class="font-bold text-lg text-gray-800">{{ username }}</div>
                    </div>
                </div>
            </div>

            <div class="bg-white p-2 rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.08)]">
                <div v-for="(item, index) in menuList" :key="index" class="relative">
                    <div class="py-3.5 px-4 flex justify-between items-center group hover:bg-gray-50 rounded-xl transition-all duration-200 cursor-pointer"
                        @click="handleMenuClick(item)">
                        <div class="flex items-center space-x-4">
                            <div
                                class="p-2 rounded-full bg-gray-50 group-hover:bg-white group-hover:shadow-sm transition-all duration-200">
                                <component :is="icons[item.icon]" class="w-5 h-5 text-gray-600" />
                            </div>
                            <div class="font-medium text-gray-700 group-hover:text-gray-900">{{ item.name }}</div>
                        </div>
                        <ChevronRight class="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                    </div>
                    <div v-if="index < menuList.length - 1" class="h-px bg-gray-100 mx-3"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import logoImg from '@/assets/logo.png'
import PageTitle from '@/components/common/PageTitle.vue';
import { useUserStore } from '@/stores/user.store';

// 获取用户存储实例
const userStore = useUserStore();
// 获取路由实例
const router = useRouter();

// 计算属性：检查用户是否已登录
const isUserLoggedIn = computed(() => userStore.isLoggedIn);

// 用户信息可能是 null，所以添加默认值
const username = computed(() => userStore.currentUser?.username || '未登录');

import { ChevronRight, ShoppingBag, ShoppingCart, Heart, MapPin, Shield, FileText, UserX, LogOut } from 'lucide-vue-next';

const menuList = [
    {
        name: 'My Address',
        path: '/address',
        icon: 'MapPin'
    },
    {
        name: 'My Order',
        path: '/order',
        icon: 'ShoppingBag'
    },
    {
        name: 'My Cart',
        path: '/cart',
        icon: 'ShoppingCart'
    },
    {
        name: 'My Favorites',
        path: '/favorite',
        icon: 'Heart'
    },
    {
        name: 'Privacy Policy',
        path: '/privacy-policy',
        icon: 'Shield'
    },
    {
        name: 'Terms of Service',
        path: '/terms-of-service',
        icon: 'FileText'
    },
    {
        name: 'Delete Account',
        path: '/delete-account',
        icon: 'UserX'
    },
    {
        name: 'Logout',
        path: '',
        icon: 'LogOut'
    },
];

// 菜单点击处理函数
const handleMenuClick = (item) => {
    if (item.name === 'Logout') {
        // 处理退出逻辑，添加确认弹窗
        if (confirm('Are you sure you want to logout?')) {
            userStore.logout();
            router.push('/login');
        }
    } else if (item.path) {
        // 处理其他菜单项的跳转
        router.push(item.path);
    }
};

// 图标映射对象
const icons = {
    ShoppingBag,
    ShoppingCart,
    Heart,
    MapPin,
    Shield,
    FileText,
    UserX,
    LogOut
}
</script>