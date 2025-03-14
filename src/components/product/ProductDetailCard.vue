<template>
    <div class="img relative">
        <img :src="product.mainImage || undefined" alt="" class="w-full">

        <!-- 图片下方的圆角卡片 - 保持负边距向上偏移 -->
        <div class="bg-white rounded-t-2xl h-auto z-10 relative -mt-6 py-4">
            <!-- 文字区域 -->
            <div class="px-4">
                <!-- 价格+销量 -->
                <div class="flex items-end justify-between">
                    <div class="flex items-end">
                        <!-- 促销价 -->
                        <div class="text-red-500 font-bold text-[22px]">
                            {{ formattedPrice }}
                        </div>
                        <!-- 原价（划线价） -->
                        <div v-if="showPromotion" class="ml-2 line-through text-gray-400 text-[14px]">
                            {{ formattedOriginalPrice }}
                        </div>
                    </div>
                    <div class="font-bold text-[14px]">Sales:{{ product.salesCount || 0 }}</div>
                </div>

                <!-- 标题 -->
                <div class="font-bold text-[18px] mt-2">{{ product.name }}</div>

                <!-- 文字介绍 -->
                <div class="mt-4">{{ product.content }}</div>
            </div>

            <div class="mt-4">
                <img v-for="(imgUrl, index) in detailImagesList" :key="index" :src="imgUrl" alt="商品详情图"
                    class="w-full" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getFormattedPrice } from '@/utils/price.utils';
import type { Product } from '@/types/product.type';

// 定义组件属性
const props = defineProps<{
    product: Product;
}>();

// 解析详情图片
const detailImagesList = computed(() => {
    if (!props.product?.detailImages) return [];

    try {
        return typeof props.product.detailImages === 'string'
            ? JSON.parse(props.product.detailImages)
            : [];
    } catch (error) {
        console.error('解析商品详情图片失败:', error);
        return [];
    }
});

// 获取格式化后的价格
const formattedPrice = computed(() => {
    return getFormattedPrice(props.product);
});

// 获取原价（用于显示划线价）
const originalPrice = computed(() => {
    if (!props.product?.skus?.length) return null;
    return props.product.skus[0].price;
});

// 格式化原价
const formattedOriginalPrice = computed(() => {
    if (!originalPrice.value) return '';
    return originalPrice.value.toLocaleString('mn-MN') + ' ₮';
});

// 是否显示促销价
const showPromotion = computed(() => {
    return props.product?.is_promotion === 1 &&
        props.product?.skus?.[0]?.promotion_price !== undefined;
});
</script>