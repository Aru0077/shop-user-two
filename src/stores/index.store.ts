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

    // 第一阶段：仅初始化核心数据
    userStore.init();

    // 首屏必需的数据 
    await productStore.init({
        loadHomeDataOnly: true // 只加载首页数据，分类等数据可以延迟加载
    });

    // 第二阶段：延迟500ms后初始化其他重要数据
    setTimeout(async () => {
        const cartStore = useCartStore();
        await cartStore.initCart();

        // 第三阶段：用户相关数据在用户已登录时延迟加载
        if (userStore.isLoggedIn) {
            setTimeout(async () => {
                const favoriteStore = useFavoriteStore();
                const addressStore = useAddressStore();
                const orderStore = useOrderStore();

                // 并行初始化用户相关数据
                await Promise.all([
                    favoriteStore.init(),
                    addressStore.init(),
                    orderStore.init()
                ]);

                // 合并本地购物车到服务器
                await cartStore.mergeLocalCartToServer();
            }, 1000);
        }
    }, 500);
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