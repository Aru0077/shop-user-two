<!-- src/views/cart/CartPage.vue -->
<template>
    <div class="pageContent pb-32">
        <!-- 顶部标题栏 -->
        <div class="flex justify-between items-center mb-4">
            <PageTitle mainTitle="My Cart" />
            <div v-if="cartItems.length > 0" @click="toggleEditMode" class="text-sm font-medium cursor-pointer">
                {{ isEditMode ? 'Done' : 'Edit' }}
            </div>
        </div>

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
                :isEditMode="isEditMode" @toggle-select="toggleSelectItem" @update-quantity="updateItemQuantity"
                @remove="removeItem" />
        </div>

        <!-- 底部结算栏 -->
        <CartSummary v-if="cartItems.length > 0" :isAllSelected="isAllSelected" :selectedCount="selectedItems.length"
            :totalAmount="totalSelectedAmount" :isEditMode="isEditMode" @toggle-select-all="toggleSelectAll"
            @checkout="checkout" @batch-remove="batchRemove" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '@/stores/cart.store';
import { useUserStore } from '@/stores/user.store';
import { useTempOrderStore } from '@/stores/temp-order.store';
import { useToast } from '@/composables/useToast';
import PageTitle from '@/components/common/PageTitle.vue';
import CartItem from '@/components/cart/CartItem.vue';
import CartSummary from '@/components/cart/CartSummary.vue';
import EmptyCart from '@/components/cart/EmptyCart.vue';

// 初始化
const router = useRouter();
const cartStore = useCartStore();
const userStore = useUserStore();
const tempOrderStore = useTempOrderStore();
const toast = useToast();

// 状态
const loading = ref(false);
const isEditMode = ref(false);
const selectedItems = ref<number[]>([]);

// 监听加载状态
watch(() => cartStore.loading, (newLoading) => {
    loading.value = newLoading;
});

// 计算属性
const cartItems = computed(() => cartStore.cartItems);

const isAllSelected = computed(() => {
    // 只考虑可购买的商品
    const availableItems = cartItems.value.filter(item => item.isAvailable);
    if (availableItems.length === 0) return false;
    return availableItems.every(item => selectedItems.value.includes(item.id));
});

const totalSelectedAmount = computed(() => {
    return cartItems.value
        .filter(item => selectedItems.value.includes(item.id) && item.isAvailable)
        .reduce((sum, item) => {
            const price = item.skuData?.promotion_price ?? item.skuData?.price ?? 0;
            return sum + price * item.quantity;
        }, 0);
});

// 检查商品是否被选中
const isItemSelected = (id: number): boolean => {
    return selectedItems.value.includes(id);
};

// 切换商品选中状态
const toggleSelectItem = (id: number) => {
    const item = cartItems.value.find(item => item.id === id);
    // 只允许选择可购买的商品
    if (!item || !item.isAvailable) return;

    const index = selectedItems.value.indexOf(id);
    if (index === -1) {
        selectedItems.value.push(id);
    } else {
        selectedItems.value.splice(index, 1);
    }
};

// 全选/取消全选
const toggleSelectAll = () => {
    if (isAllSelected.value) {
        // 取消全选
        selectedItems.value = [];
    } else {
        // 全选（只选择可购买的商品）
        selectedItems.value = cartItems.value
            .filter(item => item.isAvailable)
            .map(item => item.id);
    }
};

// 切换编辑模式
const toggleEditMode = () => {
    isEditMode.value = !isEditMode.value;
};

// 更新商品数量
const updateItemQuantity = async (id: number, quantity: number) => {
    try {
        await cartStore.updateItem(id, { quantity });
    } catch (error: any) {
        toast.error(error.message || '更新数量失败');
    }
};

// 移除单个商品
const removeItem = async (id: number) => {
    try {
        await cartStore.deleteItem(id);
        // 从选中列表中移除
        const index = selectedItems.value.indexOf(id);
        if (index !== -1) {
            selectedItems.value.splice(index, 1);
        }
    } catch (error: any) {
        toast.error(error.message || '删除失败');
    }
};

// 批量删除商品
const batchRemove = async () => {
    if (selectedItems.value.length === 0) return;

    const confirmed = window.confirm(`确认删除选中的 ${selectedItems.value.length} 件商品?`);
    if (!confirmed) return;

    try {
        // 一个个删除，因为 API 不支持批量删除
        for (const id of [...selectedItems.value]) {
            await cartStore.deleteItem(id);
        }

        // 清空选中列表
        selectedItems.value = [];
        toast.success('已删除选中商品');
    } catch (error: any) {
        toast.error(error.message || '批量删除失败');
    }
};

// 去结算 创建临时订单
const checkout = async () => {
    if (selectedItems.value.length === 0) {
        toast.error('请选择要结算的商品');
        return;
    }

    // 检查用户是否登录
    if (!userStore.isLoggedIn) {
        toast.info('请先登录');
        router.push({
            path: '/login',
            query: { redirect: '/cart' }
        });
        return;
    }

    loading.value = true;
    try {
        // 确保临时订单store已初始化
        try {
            await tempOrderStore.init();
        } catch (error) {
            console.error('初始化临时订单失败:', error);
        }

        const tempOrder = await tempOrderStore.createTempOrder({
            mode: 'cart',
            cartItemIds: selectedItems.value
        });

        if (!tempOrder) {
            throw new Error('创建临时订单失败');
        }

        // 跳转到结账页面
        router.push({
            path: '/checkout',
            query: {
                tempOrderId: tempOrder.id
            }
        });
    } catch (error: any) {
        toast.error(error.message || '创建订单失败，请重试');
        console.error('创建临时订单失败:', error);
    } finally {
        loading.value = false;
    }
};

// 去首页购物
const goToHome = () => {
    router.push('/home');
};

// 监听购物车变化，自动修正选中状态
watch(cartItems, (newItems) => {
    // 过滤掉已不存在或不可购买的商品 ID
    selectedItems.value = selectedItems.value.filter(id =>
        newItems.some(item => item.id === id && item.isAvailable)
    );
}, { deep: true });

// 组件挂载时获取购物车数据 
onMounted(async () => {
    loading.value = true;
    try {
        // 确保购物车已初始化
        try {
            // 直接调用初始化方法，不需要检查 isInitialized
            await cartStore.init();
        } catch (error) {
            console.error('初始化购物车失败:', error);
        }

        // 刷新购物车数据
        if (userStore.isLoggedIn) {
            await cartStore.getCartList();
        }

        // 初始化完成后，选择可购买商品
        if (cartItems.value.length > 0) {
            // 默认全选可购买的商品
            selectedItems.value = cartItems.value
                .filter(item => item.isAvailable)
                .map(item => item.id);
        }
    } catch (error) {
        toast.error('加载购物车失败，请刷新页面重试');
        console.error('初始化购物车失败:', error);
    } finally {
        loading.value = false;
    }
});

// 组件销毁时清理资源
onBeforeUnmount(() => {
    // 任何需要清理的资源（如事件监听器等）可以在这里处理
});
</script>