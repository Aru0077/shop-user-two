<!-- src/components/home/Banner.vue -->
<template>
    <div class="h-[180px] w-full rounded-3xl relative overflow-hidden" @click="productlist">
        <div class="absolute inset-0 w-full h-full">
            <img :src="bannerData?.imageUrl || 'https://img.js.design/assets/img/60f77156d961d24e3cf74934.png'"
                :alt="bannerData?.title || '促销产品图片'" class="w-full h-full object-cover">
        </div>
        <div class="absolute inset-0 p-6 flex flex-col justify-center items-start z-10 gap-2">
            <div class="text-[25px] font-bold">{{ bannerData?.discount || '30% Off' }}</div>
            <div>{{ bannerData?.title || '2025 New Product' }}</div>
            <div>{{ bannerData?.date || '2025-2-20' }}</div>
            <div class="bg-black w-[90px] h-[30px] flex items-center justify-center text-white rounded-full">Get
                Now</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

// 定义 banner 数据接口
interface BannerData {
    id: number;
    imageUrl: string;
    title: string;
    content?: string;
    discount?: string;
    date?: string;
}

// 定义组件 props
defineProps < {
    bannerData: BannerData | null;
} > ();

// 点击 banner 跳转到促销产品列表
const productlist = () => {
    router.push('/product-list/promotion');
};
</script>