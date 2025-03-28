<template>
    <div class="flex flex-col items-center justify-center min-h-screen">
        <div class="text-center">
            <div class="spinner mb-4"></div>
            <h2 class="text-xl font-semibold mb-2">正在处理Facebook登录...</h2>
            <p class="text-gray-600">请稍候，正在完成登录过程</p>
        </div>
    </div>
</template>

<script setup lang="ts">
// Facebook回调页面只需要显示加载提示
// 实际处理逻辑在app-initializer.ts中完成
</script>

<style scoped>
.spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-left-color: #1877F2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>