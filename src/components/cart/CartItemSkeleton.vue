<!-- src/components/cart/CartItemSkeleton.vue -->
<template>
    <div class="flex flex-col bg-white rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.08)] overflow-hidden mb-3">
        <div class="p-3 flex items-start">
            <!-- 选择框位置 -->
            <div class="mr-3 mt-1">
                <div class="w-5 h-5 rounded-sm bg-gray-200 animate-pulse"></div>
            </div>

            <!-- 商品图片位置 -->
            <div class="w-24 h-24 rounded-lg overflow-hidden mr-3 flex-shrink-0 bg-gray-200 animate-pulse"></div>

            <!-- 商品信息 -->
            <div class="flex-1 min-w-0">
                <!-- 商品名称 -->
                <div class="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                <div class="h-4 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>

                <!-- 规格信息 -->
                <div class="h-3 bg-gray-200 rounded w-2/3 mb-4 animate-pulse"></div>

                <!-- 价格和数量 -->
                <div class="flex justify-between items-end mt-2">
                    <div class="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div class="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
// 无需状态和逻辑
</script>