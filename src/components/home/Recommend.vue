<!-- src/components/home/Recommend.vue -->
<template>
    <div>
        <div class="flex justify-between items-center px-1 mb-3">
            <div class="text-[18px] font-bold">{{ title }}</div>
            <div class="text-[11px] font-semibold text-gray-500" @click="navigateToList">{{ viewAllText }}</div>
        </div>

        <ProductGrid :products="products" />
    </div>
</template>

<script setup lang="ts">
import ProductGrid from '../product/ProductGrid.vue';
import { useRouter } from 'vue-router';
import type { Product } from '@/types/product.type';

const router = useRouter();

// 使用 TypeScript 定义 props
const props = withDefaults(defineProps < {
    // 产品数据
    products: Product[];
    // 标题
    title?: string;
    // "查看全部"文本
    viewAllText?: string;
    // 商品类型，用于跳转到正确的商品列表
    type?: string;
} > (), {
    title: 'New Arrivals',
    viewAllText: 'View All',
    type: 'latest'
});

// 点击"查看全部"时导航到相应的商品列表页面
const navigateToList = () => {
    router.push(`/product-list/${props.type}`);
};
</script>