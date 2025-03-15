<template>
    <div class="h-[60px]">

        <div class=" bg-gray-900 h-full w-full  flex items-center justify-between">
            <div class="flex items-center h-[60px] gap-6 px-4">
                <Heart :size="30" class=" text-white" />
                <SquareArrowOutUpRight :size="30" class=" text-white" />
            </div>

            <div class="flex items-center justify-center text-gray-900 font-bold p-4 box-border">
                <div class="h-[45px] bg-white rounded-l-lg flex items-center justify-center px-5 pt-2" @click="openSkuSelector('cart')">
                    <ShoppingCartPlus badgeColor="#111827" :size="22" />
                </div>
                <div class="h-[45px] bg-white rounded-r-lg flex items-center justify-center px-5 text-[16px]" @click="openSkuSelector('buy')">
                    <Wallet class="mr-3" />
                    Buy now
                </div>
            </div>
        </div>

        <!-- SKU 选择器 -->
        <SkuSelector :product="product" :is-open="isSkuSelectorOpen" :mode="selectorMode"
            @update:is-open="isSkuSelectorOpen = $event" @added-to-cart="handleAddedToCart" @buy-now="handleBuyNow"
            @error="handleError" />


    </div>
</template>

<script setup>
import { ref, inject } from 'vue';
import { Heart, SquareArrowOutUpRight, Wallet } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useFavoriteStore } from '@/stores/favorite.store';
import { useCartStore } from '@/stores/cart.store';
import { useUserStore } from '@/stores/user.store';
import ShoppingCartPlus from '@/components/icon/ShoppingCartPlus.vue';
import SkuSelector from '@/components/product/SkuSelector.vue';

// 注入父组件传递的产品数据
const product = inject('product');

// 路由
const router = useRouter();

// 商店实例
const favoriteStore = useFavoriteStore();
const cartStore = useCartStore();
const userStore = useUserStore();

// SKU选择器状态
const isSkuSelectorOpen = ref(false);
const selectorMode = ref('cart'); // 'cart' 或 'buy'

// 打开SKU选择器
const openSkuSelector = (mode) => {
    selectorMode.value = mode;
    isSkuSelectorOpen.value = true;
};

// 处理收藏
const toggleFavorite = async () => {
    if (!userStore.isLoggedIn) {
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
        return;
    }

    if (!product.value) return;

    try {
        if (favoriteStore.isFavorite(product.value.id)) {
            await favoriteStore.removeFavorite(product.value.id);
            // 显示取消收藏成功提示
        } else {
            await favoriteStore.addFavorite({ productId: product.value.id });
            // 显示收藏成功提示
        }
    } catch (error) {
        console.error('收藏操作失败:', error);
        // 显示错误提示
    }
};

// 处理加入购物车
const handleAddedToCart = (skuId, quantity) => {
    // 显示成功提示
    showToast('成功加入购物车');
};

// 处理立即购买
const handleBuyNow = async (skuId, quantity) => {
    try {
        // 创建订单参数
        const quickBuyParams = {
            productId: product.value.id,
            skuId: skuId,
            quantity: quantity,
            addressId: 0 // 这里需要获取用户的默认地址ID
        };

        // 导航到结算页面，将参数通过查询字符串传递
        router.push({
            path: '/checkout',
            query: {
                mode: 'quick-buy',
                productId: product.value.id,
                skuId: skuId,
                quantity: quantity
            }
        });
    } catch (error) {
        console.error('立即购买失败:', error);
        handleError('立即购买失败，请重试');
    }
};

// 处理错误
const handleError = (message) => {
    // 显示错误提示
    showToast(message, 'error');
};

// 简单的提示函数，实际项目中可能会使用更复杂的toast组件
const showToast = (message, type = 'success') => {
    alert(message); // 实际应用中应替换为更好的UI提示
};
</script>