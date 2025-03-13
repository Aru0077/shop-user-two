<template>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="(item, index) in 6" :key="index" class="w-full px-1 mb-4">
            <div class="aspect-square">
                <div class="w-full h-full">
                    <img src="https://img.js.design/assets/img/60f77157d961d24e3cf7493e.png" alt="" class="w-full h-full object-cover rounded-xl">
                </div>
                <div class="flex flex-col items-center justify-center mt-1">
                    <div class="text-[16px] font-bold">充电器</div>
                    <div class="text-[14px] font-bold">10000图</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { useUiStore } from '@/stores/ui.store';

// 引入UI状态管理
const uiStore = useUiStore();


</script>