<template>
    <div class="h-[180px] w-full rounded-3xl relative overflow-hidden">
        <div class="absolute inset-0 w-full h-full">
            <img :src="bannerData?.imageUrl || 'https://img.js.design/assets/img/60f77156d961d24e3cf74934.png'"
                :alt="bannerData?.title || '促销产品图片'" class="w-full h-full object-cover">
        </div>
        <div class="absolute inset-0 p-6 flex flex-col justify-center items-start z-10 gap-2">
            <div class="text-[25px] font-bold">{{ bannerData?.discount || '30% Off' }}</div>
            <div>{{ bannerData?.title || '2025 New Product' }}</div>
            <div>{{ bannerData?.date || '2025-2-20' }}</div>
            <div class=" bg-black w-[90px] h-[30px] flex items-center justify-center text-white rounded-full">Get
                Now</div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useProductStore } from '@/stores/product.store';

const productStore = useProductStore();
const bannerData = ref(null);

onMounted(async () => {
    // 如果首页数据还没加载，先加载
    if (!productStore.homeData) {
        await productStore.fetchHomeData();
    }

    // 从homeData中获取banner数据
    if (productStore.homeData && productStore.homeData.banner) {
        bannerData.value = productStore.homeData.banner;
    }
});
</script>