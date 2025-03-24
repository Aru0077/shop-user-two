<!-- src/components/home/Banner.vue -->
<template>
    <div class="h-[180px] w-full rounded-3xl relative overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.08)]" @click="productlist">
        <div class="absolute inset-0 w-full h-full">
            <img :src="bannerData?.imageUrl || 'https://img.js.design/assets/img/60f77156d961d24e3cf74934.png'"
                :alt="bannerData?.title || '促销产品图片'" class="w-full h-full object-cover">
        </div>
        <div class="absolute inset-0 p-6 flex flex-col justify-center items-start z-10 gap-1">
            <div class="text-[25px] font-bold">{{ bannerData?.title || '30% Off' }}</div>
            <div class="text-[16px] font-normal">{{ bannerData?.content || '2025 New Product' }}</div>
            <div class="text-[11px]">{{ formatTime(bannerData?.updatedAt) || '2025-2-20' }}</div>
            <div class="bg-black w-[90px] h-[30px] flex items-center justify-center text-white rounded-full mt-1">Get
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
    updatedAt?: string;
}

// 定义组件 props
defineProps < {
    bannerData: BannerData | null;
} > ();

// 时间格式化函数
const formatTime = (timeStr: string | undefined): string => {
    if (timeStr === undefined) {
        return ''; // 处理 timeStr 为 undefined 的情况，这里返回空字符串，你可以根据需求修改
    }
    const date = new Date(timeStr);
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    };
    return date.toLocaleDateString('zh-CN', options).replace(/\//g, '-');
};

// 点击 banner 跳转到促销产品列表
const productlist = () => {
    router.push('/product-list/promotion');
};
</script>