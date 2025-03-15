<template>
    <div class="w-full max-w-md mx-auto">
        <!-- 为每个顶级分类创建一个折叠面板 -->
        <Disclosure v-for="category in categories" :key="category.id" as="div"
            class="mt-3 overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md" v-slot="{ open }">
            <DisclosureButton
                class="flex w-full justify-between items-center bg-white px-5 py-4 text-left text-sm font-medium text-gray-800 border-l-4 border-black transition-all duration-300 hover:bg-gray-50 focus:outline-none">
                <span class="text-base tracking-wide">{{ category.name }}</span>
                <ChevronUpIcon :class="open ? 'rotate-180 transform text-black-600' : 'text-gray-400'"
                    class="h-5 w-5 transition-transform duration-300 ease-in-out" />
            </DisclosureButton>
            <DisclosurePanel
                class="border-l-4 border-black-100 bg-white px-5 pt-3 pb-4 text-sm text-gray-600 divide-y divide-gray-100">
                <!-- 显示子分类 -->
                <div v-for="subCategory in category.children || []" :key="subCategory.id"
                    class="py-3 pl-2 transition-colors duration-200 hover:text-indigo-600 cursor-pointer flex items-center space-x-2"
                    @click.stop="navigateToCategory(subCategory)">
                    <div class="w-1 h-1 rounded-full bg-gray-300"></div>
                    <span>{{ subCategory.name }}</span>
                </div>
                <!-- 如果没有子分类则显示提示 -->
                <div v-if="!category.children || category.children.length === 0" class="py-3 italic text-gray-400">
                    该分类下暂无子分类
                </div>
            </DisclosurePanel>
        </Disclosure>

        <!-- 加载中状态 -->
        <div v-if="loading" class="mt-6 text-center text-gray-500 py-8 bg-white rounded-md shadow-sm">
            <div
                class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-indigo-500 border-r-transparent mr-2 align-middle">
            </div>
            <span>加载分类中...</span>
        </div>

        <!-- 错误信息 -->
        <div v-if="error" class="mt-6 text-center text-red-500 py-4 bg-red-50 border border-red-100 rounded-md">
            {{ error }}
        </div>
    </div>
</template>

<script setup>
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue';
import { ChevronUpIcon } from 'lucide-vue-next';
import { useProductStore } from '@/stores/product.store';

// 获取商品 store
const productStore = useProductStore();
const router = useRouter();

// 计算属性，方便访问 store 状态
const categories = computed(() => productStore.categories);
const loading = computed(() => productStore.loading);
const error = computed(() => productStore.error);

// 组件挂载时获取分类数据 
onMounted(async () => {
    // 检查分类数据是否已初始化
    if (categories.value.length > 0) return;

    // 如果正在初始化中，不需要做任何事
    if (productStore.isInitializing) return;

    // 如果未初始化且没有分类数据，则获取数据
    if (!productStore.isInitialized && categories.value.length === 0) {
        try {
            await productStore.fetchCategoryTree();
        } catch (err) {
            console.error('获取分类数据失败:', err);
        }
    }
});
</script>