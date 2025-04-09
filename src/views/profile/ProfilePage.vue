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
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router'
import logoImg from '@/assets/logo.png'
import PageTitle from '@/components/common/PageTitle.vue'; 
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/composables/useToast';
import { ChevronRight, ShoppingBag, ShoppingCart, Heart, MapPin, Shield, FileText, UserX, LogOut } from 'lucide-vue-next';

// 初始化
const router = useRouter(); 
const authStore = useAuthStore();
const toast = useToast();

// 状态
const loading = ref(false);

// 用户信息
const isLoggedIn = computed(() => authStore.isLoggedIn);
const username = computed(() => authStore.user?.username || '未登录');

// 菜单列表
const menuList = [
    {
        name: 'My Addresses',
        path: '/address',
        icon: 'MapPin'
    },
    {
        name: 'My Orders',
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
        name: 'Log Out',
        path: '',
        icon: 'LogOut'
    },
];

// 图标映射
const icons = {
    ShoppingBag,
    ShoppingCart,
    Heart,
    MapPin,
    Shield,
    FileText,
    UserX,
    LogOut
};

// 菜单点击处理
const handleMenuClick = async (item) => {
    if (item.name === 'Log Out') {
        try {
            loading.value = true;
            const success = await authStore.logout();
            if (success) {
                toast.success('已退出登录');
                router.push('/login');
            }
        } catch (err) {
            toast.error('退出登录失败');
        } finally {
            loading.value = false;
        }
    } else if (item.path) {
        router.push(item.path);
    }
};

// 初始化用户数据
const initProfile = async () => {
    loading.value = true;
    try {
        // authStore 初始化
        await authStore.init();

        // 如果未登录，跳转到登录页
        if (!authStore.isLoggedIn) {
            router.push({
                path: '/login',
                query: { redirect: router.currentRoute.value.fullPath }
            });
        }
    } catch (err) {
        console.error('初始化用户数据失败:', err);
    } finally {
        loading.value = false;
    }
};

// 组件挂载时初始化
onMounted(() => {
    initProfile();
});

// 组件卸载前清理资源
onUnmounted(() => {
    // 清理资源，避免内存泄漏
});
</script>