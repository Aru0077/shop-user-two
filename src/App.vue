<template>
    <div id="app" class=" flex flex-col h-screen w-screen overflow-hidden">

        <!-- 启动页 -->
        <div v-if="isAppLoading" class="fixed inset-0 z-50 flex items-center justify-center bg-white">
            <div class="text-center">
                <img src="@/assets/logo.png" alt="Logo" class="w-24 h-24 mx-auto mb-4">
                <div class="text-lg font-bold">Loading...</div>
                <div class="mt-4 h-1 w-48 bg-gray-200 rounded-full mx-auto overflow-hidden">
                    <div class="h-full bg-black animate-pulse rounded-full"></div>
                </div>
            </div>
        </div>


        <!-- 顶部固定 navbar -->
        <div v-if="shouldShowNavbar" class=" w-screen">
            <!-- 移动端navbar -->
            <div v-if="isMobile" class="h-[60px]">
                <NavBar />
            </div>

            <!-- 桌面端navbar -->
            <div v-if="isDesktop">
                22
            </div>

        </div>

        <!-- 内容区域 - 添加transition效果以增强感知性能 -->
        <div class="flex-1 overflow-hidden w-full">
            <router-view v-slot="{ Component }">
                <suspense>
                    <template #default>
                        <keep-alive :include="['HomePage', 'CategoryPage', 'ProfilePage']">
                            <component :is="Component" />
                        </keep-alive>
                    </template>
                    <template #fallback>
                        <div class="flex items-center justify-center h-full">
                            <div class="text-center">加载中...</div>
                        </div>
                    </template>
                </suspense>
            </router-view>
        </div>

        <!-- 底部固定TabBar -->
        <div v-show="isMobile && showTabBar" class="h-[70px] w-full">
            <TabBar />
        </div>
    </div>
</template>

<script setup lang="ts">
// App.vue script部分
import { ref, computed, onMounted } from 'vue'; 
import { useRoute } from 'vue-router';
import { useUiStore } from '@/stores/ui.store';
import NavBar from './components/common/NavBar.vue';
import TabBar from './components/common/TabBar.vue';

const isAppLoading = ref(true);
const route = useRoute();
const uiStore = useUiStore();

// 计算属性
const showTabBar = computed(() => route.meta.showTabBar !== false);
const shouldShowNavbar = computed(() => route.meta.showNavbar !== false);
const isDesktop = computed(() => uiStore.isDesktop);
const isMobile = computed(() => uiStore.isMobile);

// 只初始化UI尺寸和加载状态
onMounted(() => {
    uiStore.initializeScreenSize();
    window.addEventListener('resize', uiStore.handleResize);
    
    // 延迟关闭启动页
    setTimeout(() => {
        isAppLoading.value = false;
    }, 1500);
});

</script>

<style>
#app {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        Oxygen, Ubuntu, Cantarell, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
}
</style>