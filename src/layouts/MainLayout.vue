<template>
    <div class="app-container flex flex-col min-h-screen">
        <!-- 导航栏 -->
        <NavBar :title="navbarTitle" :left-button="navbarConfig.leftButton" :right-button="navbarConfig.rightButton"
            @left-click="handleLeftClick" @right-click="handleRightClick" />

        <!-- 主内容区 -->
        <main class="flex-1 overflow-auto">
            <!-- 路由视图 -->
            <router-view />
        </main>

        <!-- 底部TabBar，在桌面端不显示 -->
        <TabBar v-if="showTabBar" class="md:hidden" />

        <!-- 桌面端侧边导航，只在大屏幕显示 -->
        <SideNav v-if="isDesktop" class="hidden md:block" />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUiStore } from '@/stores/ui.store';
import NavBar from '@/components/common/NavBar.vue';
import TabBar from '@/components/common/TabBar.vue';
import SideNav from '@/components/common/SideNav.vue';

const route = useRoute();
const router = useRouter();
const uiStore = useUiStore();

// 计算属性：获取当前路由的navbar配置
const navbarTitle = computed(() => route.meta.title as string || '');
const navbarConfig = computed(() => (route.meta.navbar || {}) as Record<string, any>);
const showTabBar = computed(() => route.meta.showTabBar !== false);
const isDesktop = computed(() => uiStore.isDesktop);

// 导航栏按钮处理函数
const handleLeftClick = () => {
    const leftAction = navbarConfig.value?.leftAction;
    if (leftAction === 'back') {
        router.back();
    } else if (typeof leftAction === 'function') {
        leftAction();
    }
};

const handleRightClick = () => {
    const rightAction = navbarConfig.value?.rightAction;
    if (typeof rightAction === 'function') {
        rightAction();
    }
};

// 监听屏幕尺寸变化
onMounted(() => {
    uiStore.initializeScreenSize();
    window.addEventListener('resize', uiStore.handleResize);
});

// 监听路由变化，更新页面标题
watch(() => route.meta.title, (newTitle) => {
    if (newTitle) {
        document.title = newTitle as string;
    }
});
</script>

<style scoped>
.app-container {
    position: relative;
    background-color: #f5f5f5;
}
</style>