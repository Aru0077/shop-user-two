<!-- src/views/cart/components/CartItem.vue -->
<template>
    <div class="flex items-center p-3 bg-white mb-2 rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.08)]">
        <!-- 选择器 -->
        <div class="mr-3">
            <input type="checkbox" :checked="isSelected" @change="$emit('toggle-select', item.id)"
                class="w-5 h-5 accent-black" />
        </div>

        <!-- 商品图片 -->
        <div class="w-16 h-16 rounded-md overflow-hidden mr-3">
            <img :src="item.product?.mainImage || 'https://img.js.design/assets/img/60f77157d961d24e3cf7493e.png'"
                :alt="item.product?.name" class="w-full h-full object-cover" />
        </div>

        <!-- 商品信息 -->
        <div class="flex-1">
            <div class="text-sm font-medium">{{ item.product?.name || '商品名称' }}</div>

            <!-- 规格信息 -->
            <div v-if="item.skuData?.sku_specs && item.skuData.sku_specs.length > 0" class="text-xs text-gray-500 mt-1">
                {{ formatSpecs(item.skuData.sku_specs) }}
            </div>

            <div class="flex justify-between items-center mt-1">
                <!-- 价格 -->
                <div class="text-sm font-bold text-red-500">
                    {{ formatPrice(item.skuData?.promotion_price || item.skuData?.price) }}
                </div>

                <!-- 数量 -->
                <div class="text-sm text-gray-500">
                    x{{ item.quantity }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import type { CartItem } from '@/types/cart.type';

const props = defineProps<{
    item: CartItem;
    isSelected: boolean;
}>();

defineEmits<{
    'toggle-select': [id: number];
}>();

// 格式化价格
const formatPrice = (price?: number): string => {
    if (price === undefined) return '价格未知';
    return price.toLocaleString('mn-MN') + ' ₮';
};

// 格式化规格
const formatSpecs = (specs: Array<{ spec: { name: string }, specValue: { value: string } }>): string => {
    return specs.map(spec => `${spec.spec.name}: ${spec.specValue.value}`).join(', ');
};
</script>