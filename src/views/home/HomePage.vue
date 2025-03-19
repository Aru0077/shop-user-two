<!-- HomePage.vue -->
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
        <Recommend v-if="latestProducts.length" :products="latestProducts" :title="'New Arrivals'" type="latest"
            :viewAllText="'View All'" />

        <!-- 间距 占位符 -->
        <div class="w-full h-6"></div>

        <!-- 热卖推荐 -->
        <Recommend v-if="topSellingProducts.length" :products="topSellingProducts" :title="'Best Sellers'"
            type="topselling" :viewAllText="'View All'" />


    </div>
</template>


<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useToast } from '@/composables/useToast';
import { useProductStore } from '@/stores/product.store';

import PageTitle from '@/components/common/PageTitle.vue';
import SearchInput from '@/components/home/SearchInput.vue';
import Banner from '@/components/home/Banner.vue';
import Recommend from '@/components/home/Recommend.vue';

// 添加 toast 实例
const toast = useToast();
const error = ref(null);

const productStore = useProductStore();
const loading = ref(true);
const bannerData = ref(null);

// 计算属性，获取最新产品和热门产品
const latestProducts = computed(() => productStore.latestProducts || []);
const topSellingProducts = computed(() => productStore.topSellingProducts || []);

// 监视homeData变化来更新banner数据
watch(() => productStore.homeData, (newHomeData) => {
    if (newHomeData && newHomeData.banner) {
        bannerData.value = newHomeData.banner;
    }
}, { immediate: true });

onMounted(async () => {
    loading.value = true;

    try {
        // 确保 productStore 已初始化
        await productStore.init();
        // 获取首页数据
        await productStore.getHomePageData();
    } catch (err) {
        console.error('加载首页数据失败:', err);
        error.value = err.message || '加载数据失败';
        toast.error('加载首页数据失败，请刷新页面重试');
    } finally {
        loading.value = false;
    }
});
</script>

<style></style>