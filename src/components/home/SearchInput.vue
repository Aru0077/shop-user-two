<!-- src/components/home/SearchInput.vue -->
<template>
    <!-- 搜索框以及按钮 -->
    <div class="flex justify-between items-center w-auto h-[50px]">
        <div class="w-5/6 h-full flex gap-2 px-5 justify-between items-center bg-gray-100 rounded-full">
            <div class="flex items-center w-full">
                <Search class="mr-3" />
                <input type="text" v-model="searchText" class="bg-gray-100 w-full h-auto focus:outline-none caret-black"
                    placeholder="Search..." @keyup.enter="handleSearch">
            </div>
            <X v-if="searchText" @click="clearSearch" class="cursor-pointer" />
        </div>
        <div class="">
            <div class="bg-black text-white flex justify-center items-center w-[50px] h-[50px] rounded-full cursor-pointer"
                @click="handleSearch">
                <Search />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Search, X } from 'lucide-vue-next';

const router = useRouter();
const searchText = ref('');

// 处理搜索逻辑
const handleSearch = () => {
    if (!searchText.value.trim()) return;

    // 跳转到商品列表页面，并带上搜索关键词
    router.push({
        path: '/product-list/search',
        query: { keyword: searchText.value.trim() }
    });
};

// 清除搜索内容
const clearSearch = () => {
    searchText.value = '';
};
</script>