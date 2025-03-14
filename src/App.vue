<template>
    <div id="app" class=" flex flex-col h-screen w-screen overflow-hidden">

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

        <!-- 内容区域 -->
        <div class="flex-1 overflow-hidden w-full">
            <router-view />
        </div>
        
        <!-- 底部固定TabBar -->
        <div v-show="isMobile && showTabBar" class="h-[70px] w-full">
            <TabBar />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { initializeStores } from '@/stores/index.store';
import { useRoute } from 'vue-router';
import { useUiStore } from '@/stores/ui.store';
import NavBar from './components/common/NavBar.vue';
import TabBar from './components/common/TabBar.vue';

// 初始化 store
const route = useRoute();
const uiStore = useUiStore();

// 计算属性
const showTabBar = computed(() => route.meta.showTabBar !== false);
const shouldShowNavbar = computed(() => route.meta.showNavbar !== false);
const isDesktop = computed(() => uiStore.isDesktop);
const isMobile = computed(() => uiStore.isMobile);
 




// 初始化应用时初始化所有store
onMounted(async () => {
    uiStore.initializeScreenSize();
    window.addEventListener('resize', uiStore.handleResize);
    await initializeStores();
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