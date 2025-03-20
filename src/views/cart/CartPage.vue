<!-- src/views/cart/CartPage.vue -->
<template>
    <div class="flex flex-col h-full overflow-hidden">
        <!-- 顶部标题栏（固定） -->
        <div class="z-10 bg-white px-4 pt-4">
            <div class="flex justify-between items-center">
                <PageTitle mainTitle="我的购物车" />
                <div v-if="cartItems.length > 0" @click="toggleEditMode" class="text-sm font-medium cursor-pointer">
                    {{ isEditMode ? '完成' : '编辑' }}
                </div>
            </div>
        </div>

        <!-- 中间可滚动内容区域 -->
        <div class="flex-1 overflow-y-auto mt-4  px-4">
            <!-- 加载状态 -->
            <div v-if="loading && cartItems.length === 0" class="flex justify-center items-center h-40">
                <div
                    class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-r-transparent align-middle">
                </div>
            </div>

            <!-- 空购物车状态 -->
            <EmptyCart v-else-if="cartItems.length === 0" @shop-now="goToHome" />

            <!-- 购物车列表 -->
            <div v-else>
                <CartItem v-for="item in cartItems" :key="item.id" :item="item" :isSelected="isItemSelected(item.id)"
                    :isEditMode="isEditMode" :isUpdating="isProcessing(item.id)" @toggle-select="toggleSelectItem"
                    @update-quantity="updateItemQuantity" @remove="removeItem" />
            </div>
        </div>
        <div class="h-[130px]">
            <!-- 底部结算栏（已经在组件中设置为固定定位） -->
            <CartSummary v-if="cartItems.length > 0" :isAllSelected="isAllSelected"
                :selectedCount="selectedItems.length" :totalAmount="totalSelectedAmount" :isEditMode="isEditMode"
                @toggle-select-all="toggleSelectAll" @checkout="checkout" @batch-remove="batchRemove" />
        </div>

    </div>
</template>

<script setup lang="ts">
import PageTitle from '@/components/common/PageTitle.vue';
import CartItem from '@/components/cart/CartItem.vue';
import CartSummary from '@/components/cart/CartSummary.vue';
import EmptyCart from '@/components/cart/EmptyCart.vue';
import { useCartPage } from '@/composables/useCartPage';

// 使用封装的购物车业务逻辑
const {
    loading,
    isEditMode,
    cartItems,
    selectedItems,
    totalSelectedAmount,
    isAllSelected,
    isItemSelected,
    toggleSelectItem,
    toggleSelectAll,
    toggleEditMode,
    updateItemQuantity,
    removeItem,
    batchRemove,
    checkout,
    goToHome,
    isProcessing
} = useCartPage();
</script>