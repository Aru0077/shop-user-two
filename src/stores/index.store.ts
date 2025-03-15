// src/stores/index.store.ts
import { useUserStore } from './user.store';
import { useProductStore } from './product.store';
import { useCartStore } from './cart.store';
import { useOrderStore } from './order.store';
import { useFavoriteStore } from './favorite.store';
import { useAddressStore } from './address.store';
import { useCheckoutStore } from './checkout.store';
import type { ApiError } from '@/types/common.type'

export {
    useUserStore,
    useProductStore,
    useCartStore,
    useOrderStore,
    useFavoriteStore,
    useAddressStore,
    useCheckoutStore
};

// 初始化所有store 
export async function initializeStores() {
    const userStore = useUserStore();
    const productStore = useProductStore();
    const cartStore = useCartStore();
    const favoriteStore = useFavoriteStore();
    const addressStore = useAddressStore();
    const orderStore = useOrderStore();

    // 先初始化用户状态和产品数据
    userStore.init();
    await productStore.init();

    // 初始化购物车数据（未登录用户也需要本地购物车）
    await cartStore.initCart();

    // 如果用户已登录，则初始化需要授权的数据
    if (userStore.isLoggedIn) {
        try {
            // 并行初始化用户相关数据
            await Promise.all([
                favoriteStore.init(),
                addressStore.init(),
                orderStore.init()
            ]);

            // 合并本地购物车到服务器
            await cartStore.mergeLocalCartToServer();
        } catch (error) {
            console.error('初始化用户数据失败:', error);

            // 如果获取授权数据失败，可能是token实际无效
            if ((error as ApiError).code === 401) {
                userStore.clearUserState();
            }
        }
    }
}

// 用户登录后的处理
export async function onUserLogin() {
    const cartStore = useCartStore();
    const favoriteStore = useFavoriteStore();
    const addressStore = useAddressStore();

    try {
        // 并行初始化各模块数据
        await Promise.all([
            cartStore.fetchCartFromServer(),
            favoriteStore.init(),
            addressStore.fetchAddresses(true) // 强制刷新
        ]);

        // 合并本地购物车到服务器
        await cartStore.mergeLocalCartToServer();
    } catch (error) {
        console.error('登录后初始化数据失败:', error);
    }
}

// 清除所有用户相关缓存
export function clearAllUserRelatedCaches() {
    const userStore = useUserStore();
    const favoriteStore = useFavoriteStore();
    const addressStore = useAddressStore();
    const orderStore = useOrderStore();
    const checkoutStore = useCheckoutStore();

    // 清除用户状态
    userStore.clearUserState();

    // 清除其他模块缓存
    addressStore.clearAddressCache();
    favoriteStore.clearFavoriteCache();
    orderStore.clearAllOrderCache();
    checkoutStore.clearCheckoutCache();
}