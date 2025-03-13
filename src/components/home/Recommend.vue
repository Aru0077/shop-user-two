<template>
    <div>
        <div class="flex justify-between items-center px-1 mb-3">
            <div class="text-[18px] font-bold">{{ title }}</div>
            <div class="text-[11px] font-semibold text-gray-500">{{ viewAllText }}</div>
        </div>

        <ProductGrid :products="products" />

    </div>
</template>

<script setup>
import { defineProps } from 'vue';
import ProductGrid from '../product/ProductGrid.vue';

const props = defineProps({
    // 产品数据
    products: {
        type: Array,
        default: () => []
    },
    // 标题
    title: {
        type: String,
        default: 'New Arrivals'
    },
    // "查看全部"文本
    viewAllText: {
        type: String,
        default: 'View All'
    }
});
</script>