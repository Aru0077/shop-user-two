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
        <Recommend v-if="latestProducts.length" :products="latestProducts" :title="'New Arrivals'"
            :viewAllText="'View All'" />

        <!-- 间距 占位符 -->
        <div class="w-full h-6"></div>

        <!-- 热卖推荐 -->
        <Recommend v-if="topSellingProducts.length" :products="topSellingProducts" :title="'Best Sellers'"
            :viewAllText="'View All'" />


    </div>
</template>


<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { useProductStore } from '@/stores/product.store';

import PageTitle from '@/components/common/PageTitle.vue';
import SearchInput from '@/components/home/SearchInput.vue';
import Banner from '@/components/home/Banner.vue';
import Recommend from '@/components/home/Recommend.vue';


const productStore = useProductStore();
const loading = ref(true);
const bannerData = ref(null);

// Calculate banner data whenever homeData changes
watch(() => productStore.homeData, (newHomeData) => {
    if (newHomeData && newHomeData.banner) {
        bannerData.value = newHomeData.banner;
    }
}, { immediate: true }); // Immediate evaluation to handle initial state

// 计算属性，获取最新产品和热门产品
const latestProducts = computed(() => productStore.latestProducts || []);
const topSellingProducts = computed(() => productStore.topSellingProducts || []);

// 替换现有的onMounted方法
onMounted(async () => {
    // 优先渲染UI，延迟加载数据
    loading.value = true;

    // 使用nextTick确保DOM更新后再执行数据加载
    nextTick(async () => {
        try {
            // 检查初始化状态
            if (productStore.isInitialized || productStore.isInitializing) {
                // 已初始化或正在初始化，不需要做任何事情
                loading.value = false;
                return;
            }

            // 如果尚未初始化，则初始化产品数据
            if (!productStore.homeData) {
                await productStore.fetchHomeData();
            }
        } catch (err) {
            console.error('加载首页数据失败:', err);
        } finally {
            loading.value = false;
        }
    });
});


</script>

<style>
.ff {
    height: 100%;
    overflow-y: auto;
}
</style>