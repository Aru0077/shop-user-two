<template>
    <div>
        <div class="flex justify-between items-center px-1 mb-3">
            <div class="text-[18px] font-bold">New Arrivals</div>
            <div class="text-[11px] font-semibold text-gray-500">View All</div>
        </div>

        <ProductGrid />
        
    </div>
</template>

<script setup>
import ProductGrid from '../product/ProductGrid.vue';
    
</script>