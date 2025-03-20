<template>
    <div class="img relative">
        <!-- 主图骨架屏 -->
        <div v-if="!product.mainImage" class="w-full h-[400px] bg-gray-200 animate-pulse rounded"></div>
        <img v-else :src="product.mainImage" alt="" class="w-full">

        <!-- 图片下方的圆角卡片 - 保持负边距向上偏移 -->
        <div class="bg-white rounded-t-2xl h-auto z-10 relative -mt-6 py-4">
            <!-- 文字区域 -->
            <div class="px-4">
                <!-- 价格+销量 -->
                <div class="flex items-end justify-between">
                    <div class="flex items-end">
                        <!-- 骨架屏加载状态 -->
                        <div v-if="!product.skus?.length" class="h-[22px] w-[120px] bg-gray-200 animate-pulse rounded">
                        </div>
                        <!-- 显示促销价 -->
                        <div v-else class="text-red-500 font-bold text-[22px]">
                            {{ formattedPrice }}
                        </div>
                        <!-- 原价（划线价） -->
                        <div v-if="showPromotion" class="ml-2 line-through text-gray-400 text-[14px]">
                            {{ formattedOriginalPrice }}
                        </div>
                    </div>
                    <!-- 销量也使用骨架屏 -->
                    <div v-if="!product.skus?.length" class="h-[14px] w-[80px] bg-gray-200 animate-pulse rounded"></div>
                    <div v-else class="font-bold text-[14px]">Sales:{{ product.salesCount || 0 }}</div>
                </div>

                <!-- 标题骨架屏 -->
                <div v-if="!product.name" class="h-[24px] w-full bg-gray-200 animate-pulse rounded mt-2"></div>
                <div v-else class="font-bold text-[18px] mt-2">{{ product.name }}</div>

                <!-- 文字介绍骨架屏 -->
                <div v-if="!product.content" class="mt-4">
                    <div class="h-[16px] w-full bg-gray-200 animate-pulse rounded mb-2"></div>
                    <div class="h-[16px] w-5/6 bg-gray-200 animate-pulse rounded mb-2"></div>
                    <div class="h-[16px] w-4/6 bg-gray-200 animate-pulse rounded"></div>
                </div>
                <div v-else class="mt-4">{{ product.content }}</div>
            </div>

            <div class="mt-4">
                <!-- 详情图片骨架屏 -->
                <div v-if="!detailImagesList.length" class="w-full">
                    <div class="h-[200px] w-full bg-gray-200 animate-pulse rounded mb-2"></div>
                    <div class="h-[200px] w-full bg-gray-200 animate-pulse rounded mb-2"></div>
                </div>
                <img v-else v-for="(imgUrl, index) in detailImagesList" :key="index" :src="imgUrl" alt="商品详情图"
                    class="w-full" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatPrice } from '@/utils/price.utils';
import type { Product } from '@/types/product.type';

// 定义组件属性
const props = defineProps<{
    product: Product;
}>();

// 解析详情图片
const detailImagesList = computed(() => {
    if (!props.product?.detailImages) return [];

    try {
        if (typeof props.product.detailImages === 'string') {
            // 确保字符串被正确解析为数组
            const parsed = JSON.parse(props.product.detailImages);
            return Array.isArray(parsed) ? parsed : [];
        } else if (Array.isArray(props.product.detailImages)) {
            return props.product.detailImages;
        } else {
            return [];
        }
    } catch (error) {
        console.error('解析商品详情图片失败:', error);
        return [];
    }
});

// 获取格式化后的价格
const formattedPrice = computed(() => {
    if (!props.product?.skus?.length) return formatPrice(0);
    
    const sku = props.product.skus[0];
    // 增加安全检查
    if (!sku) return formatPrice(0);
    
    // 判断是否有促销价
    if (props.product.is_promotion === 1 && 
        sku.promotion_price !== undefined && 
        sku.promotion_price !== null) {
        return formatPrice(sku.promotion_price);
    }
    return formatPrice(sku.price);
});

// 获取原价（用于显示划线价）
const originalPrice = computed(() => {
    if (!props.product?.skus?.length) return null;
    return props.product.skus[0].price;
});

// 格式化原价
const formattedOriginalPrice = computed(() => {
    if (!originalPrice.value) return '';
    return formatPrice(originalPrice.value);
});

// 是否显示促销价
const showPromotion = computed(() => {
    return props.product?.is_promotion === 1 &&
        props.product?.skus?.[0]?.promotion_price !== undefined &&
        props.product?.skus?.[0]?.promotion_price !== null;
});
</script>