<!-- src/components/cart/EmptyCart.vue -->
<template>
    <div class="flex flex-col items-center justify-center h-[60vh]">
        <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ShoppingCart :size="36" class="text-gray-400" />
        </div>
        <div class="text-gray-500 mb-6">Your Cart is Empty</div>
        <button @click="$emit('shop-now')" class="bg-black text-white py-3 px-8 rounded-full flex items-center">
            <ShoppingBag :size="16" class="mr-2" />
            Shop Now
        </button>
    </div>
</template>

<script setup lang="ts">
import { ShoppingCart, ShoppingBag } from 'lucide-vue-next';

defineEmits<{
    'shop-now': [];
}>();
</script>