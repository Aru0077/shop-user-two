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
        <Recommend v-if="latestProducts.length" :products="latestProducts" :title="'New Arrivals'"  type="latest"
            :viewAllText="'View All'" />

        <!-- 间距 占位符 -->
        <div class="w-full h-6"></div>

        <!-- 热卖推荐 -->
        <Recommend v-if="topSellingProducts.length" :products="topSellingProducts" :title="'Best Sellers'" type="topselling"
            :viewAllText="'View All'" />


    </div>
</template>


<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
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

// Calculate banner data whenever homeData changes
watch(() => productStore.homeData, (newHomeData) => {
    if (newHomeData && newHomeData.banner) {
        bannerData.value = newHomeData.banner;
    }
}, { immediate: true });

// 计算属性，获取最新产品和热门产品
const latestProducts = computed(() => productStore.latestProducts || []);
const topSellingProducts = computed(() => productStore.topSellingProducts || []);

// 简化后的 onMounted 方法 - 移除所有数据初始化代码
onMounted(async () => {
    loading.value = true;
    
    try {
        // 确保商品 store 已初始化
        if (!productStore.isInitialized && !productStore.isInitializing) {
            await productStore.init();
        } else if (productStore.isInitializing) {
            // 等待初始化完成
            await new Promise((resolve) => {
                const unwatch = watch(() => productStore.isInitializing, (isInitializing) => {
                    if (!isInitializing) {
                        unwatch();
                        resolve();
                    }
                });
            });
        }
        
        // 刷新首页数据（如果需要）
        await productStore.refreshHomeDataIfNeeded();
    } catch (err) {
        console.error('加载首页数据失败:', err);
        error.value = err.message || '加载数据失败';
        toast.error('加载首页数据失败，请刷新页面重试');
    } finally {
        loading.value = false;
    }
});

// 添加 onBeforeUnmount 钩子清理资源
onBeforeUnmount(() => {
    if (productStore.dispose) {
        productStore.dispose();
    }
});

</script>

<style>
.ff {
    height: 100%;
    overflow-y: auto;
}
</style>