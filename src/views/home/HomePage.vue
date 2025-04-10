<!-- src/views/home/HomePage.vue -->
<template>
    <div class="pageContent">
        <!-- 页面标题 -->
        <PageTitle mainTitle="Welcome" subtitle="Uni Mall Website" />
        <!-- 间距 占位符 -->
        <div class="w-full h-4"></div>
        <!-- 搜索框 -->
        <SearchInput />
        <!-- 间距 占位符 -->
        <div class="w-full h-6"></div>
        <!-- 促销海报 -->
        <Banner :bannerData="bannerData" />
        <!-- 间距 占位符 -->
        <div class="w-full h-6"></div>
        <!-- 新品推荐 -->
        <Recommend v-if="latestProducts.length" :products="latestProducts" title="New Arrivals" type="latest"
            viewAllText="View All" />
        <!-- 间距 占位符 -->
        <div class="w-full h-6"></div>
        <!-- 热卖推荐 -->
        <Recommend v-if="topSellingProducts.length" :products="topSellingProducts" title="Best Sellers"
            type="topselling" viewAllText="View All" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useToast } from '@/composables/useToast';
import { useProductStore } from '@/stores/product.store';
import type { Product } from '@/types/product.type';

import PageTitle from '@/components/common/PageTitle.vue';
import SearchInput from '@/components/home/SearchInput.vue';
import Banner from '@/components/home/Banner.vue';
import Recommend from '@/components/home/Recommend.vue';

// 使用 toast 服务
const toast = useToast();
const error = ref < string | null > (null);

// 使用产品 store
const productStore = useProductStore();
const loading = ref(true);
const bannerData = ref < {
    id: number;
    imageUrl: string;
    title: string;
    content?: string;
    discount?: string;
    date?: string;
} | null > (null);

// 计算属性，获取最新产品和热门产品
const latestProducts = computed < Product[] > (() => productStore.latestProducts || []);
const topSellingProducts = computed < Product[] > (() => productStore.topSellingProducts || []);

// 监视 homeData 变化来更新 banner 数据
watch(() => productStore.homeData, (newHomeData) => {
    if (newHomeData && newHomeData.banner) {
        bannerData.value = newHomeData.banner;
    }
}, { immediate: true });

onMounted(async () => {
    loading.value = true;

    try {
        // 确保 productStore 已初始化
        await productStore.ensureInitialized();
        // 获取首页数据 - 使用正确的方法名
        await productStore.getHomePageData();
    } catch (err: any) {
        console.error('Failed to load homepage data:', err);
        error.value = err.message || 'Failed to load data';
        toast.error('Failed to load homepage data, please refresh the page and try again');
    } finally {
        loading.value = false;
    }
});
</script>

<style></style>