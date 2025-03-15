<template>
    <div class="h-[60px]">

        <div class=" bg-gray-900 h-full w-full  flex items-center justify-between">
            <div class="flex items-center h-[60px] gap-6 px-4">
                <Heart :size="30" class=" text-white" />
                <SquareArrowOutUpRight :size="30" class=" text-white" />
            </div>

            <div class="flex items-center justify-center text-gray-900 font-bold p-4 box-border">
                <div class="h-[45px] bg-white rounded-l-lg flex items-center justify-center px-5 pt-2"
                    @click="openSkuSelector('cart')">
                    <ShoppingCartPlus badgeColor="#111827" :size="22" />
                </div>
                <div class="h-[45px] bg-white rounded-r-lg flex items-center justify-center px-5 text-[16px]"
                    @click="openSkuSelector('buy')">
                    <Wallet class="mr-3" />
                    Buy now
                </div>
            </div>
        </div>

        <!-- SKU 选择器 -->
        <SkuSelector :product="product" :is-open="isSkuSelectorOpen" :mode="selectorMode"
            @update:is-open="isSkuSelectorOpen = $event" />


    </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue';
import { Heart, SquareArrowOutUpRight, Wallet } from 'lucide-vue-next';
import ShoppingCartPlus from '@/components/icon/ShoppingCartPlus.vue';
import SkuSelector from '@/components/product/SkuSelector.vue';
import type { ProductDetail } from '@/types/product.type';

// 注入父组件传递的产品数据
const product = inject < ProductDetail | null > ('product', null);

// SKU选择器状态 
const isSkuSelectorOpen = ref(false);
const selectorMode = ref < 'cart' | 'buy' > ('cart');

// 打开SKU选择器
const openSkuSelector = (mode: 'cart' | 'buy') => {
    selectorMode.value = mode;
    isSkuSelectorOpen.value = true;
};




</script>