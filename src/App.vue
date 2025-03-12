<template>
    <div id="app">
        <router-view />
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { initializeStores } from '@/stores/index.store';

// 初始化应用时初始化所有store
onMounted(async () => {
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

/* 移动端适配 */
@media (min-width: 768px) {
    #app {
        padding-left: 200px;
        /* 为侧边导航留出空间 */
    }
}
</style>