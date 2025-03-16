<!-- src/views/cart/CartPage.vue -->
<template>
    <div class="flex flex-col h-full p-4"> 
        <!-- 内容区域 -->
        <div class="flex-1 overflow-auto ">
            <!-- 页面标题 -->
            <PageTitle mainTitle="My Cart" />
            <!-- 间距 占位符 -->
            <div class="w-full h-4"></div>

            <!-- 加载状态 -->
            <div v-if="loading" class="flex justify-center items-center h-40">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>

            <!-- 空购物车状态 -->
            <div v-else-if="cartItems.length === 0" class="flex flex-col items-center justify-center h-40">
                <div class="text-gray-500">购物车空空如也</div>
            </div>

            <!-- 购物车商品列表 -->
            <template v-else>
                <CartItem v-for="item in cartItems" :key="item.id" :item="item"
                    :is-selected="selectedItems.includes(item.id)" @toggle-select="toggleSelectItem" />
            </template>
        </div>

        <!-- 底部操作区 -->
        <div class="h-[60px] bg-black text-white flex items-center px-4">
            <!-- 全选选择器 -->
            <div class="flex items-center">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll"
                    class="w-5 h-5 mr-2 accent-white" />
                <span>全选</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCartStore } from '@/stores/cart.store';
import CartItem from '@/components/cart/CartItem.vue';
import PageTitle from '@/components/common/PageTitle.vue';

const cartStore = useCartStore();

// 状态
const selectedItems = ref<number[]>([]);
const loading = ref(true);

// 获取购物车数据
onMounted(async () => {
    // if (!cartStore.isInitialized) {
    //     await cartStore.initCart();
    // } else {
    //     await cartStore.refreshCartIfNeeded();
    // }
    loading.value = false;
});

// 计算属性
const cartItems = computed(() => cartStore.cartItems);

const isAllSelected = computed(() => {
    if (cartItems.value.length === 0) return false;
    return cartItems.value.every(item => selectedItems.value.includes(item.id));
});

// 方法
const toggleSelectItem = (id: number) => {
    const index = selectedItems.value.indexOf(id);
    if (index === -1) {
        selectedItems.value.push(id);
    } else {
        selectedItems.value.splice(index, 1);
    }
};

const toggleSelectAll = () => {
    if (isAllSelected.value) {
        selectedItems.value = [];
    } else {
        selectedItems.value = cartItems.value.map(item => item.id);
    }
};
</script>