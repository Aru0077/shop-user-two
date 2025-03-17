<template>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div v-for="(item, index) in displayProducts" :key="item.id || index" class="w-full px-1 mb-4"
            @click="navigateToProductDetail(item)">
            <div class="aspect-square relative">
                <div class="w-full h-full">
                    <img :src="item.mainImage || 'https://img.js.design/assets/img/60f77157d961d24e3cf7493e.png'"
                        :alt="item.name" class="w-full h-full object-cover rounded-xl">

                    <!-- 促销标志 -->
                    <div v-if="item.is_promotion === 1"
                        class="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                        SALE
                    </div>
                </div>
                <div class="flex flex-col items-center justify-center mt-1">
                    <div class="text-[13px] font-bold">{{ item.name || '商品名称' }}</div>
                    <div class="text-[12px] font-bold">{{ getFormattedPrice(item) }}</div>
                </div>
            </div>
        </div>

        <!-- 如果没有数据，显示占位商品 -->
        <div v-if="displayProducts.length === 0" v-for="index in 6" :key="`placeholder-${index}`"
            class="w-full px-1 mb-4">
            <div class="aspect-square">
                <div class="w-full h-full">
                    <img src="https://img.js.design/assets/img/60f77157d961d24e3cf7493e.png" alt="占位图"
                        class="w-full h-full object-cover rounded-xl">
                </div>
                <div class="flex flex-col items-center justify-center mt-1">
                    <div class="text-[16px] font-bold">充电器</div>
                    <div class="text-[14px] font-bold">价格未知</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { getFormattedPrice } from '@/utils/price.utils';
import type { Product } from '@/types/product.type';

// 引入路由
const router = useRouter();

const props = defineProps({
    products: {
        type: Array as () => Product[],
        default: () => []
    },
    // 最大显示数量
    maxItems: {
        type: Number,
        default: 6
    }
});

// 计算显示的产品，最多显示maxItems个
const displayProducts = computed(() => {
    return props.products && props.products.length > 0
        ? props.products.slice(0, props.maxItems)
        : [];
});

// 跳转到商品详情页
const navigateToProductDetail = (product: Product) => {
    if (product && product.id) {
        router.push(`/product/${product.id}`);
    }
};


</script>