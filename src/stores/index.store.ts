// src/stores/index.store.ts
import { useUserStore } from './user.store';
import { useProductStore } from './product.store';
import { useCartStore } from './cart.store';
import { useOrderStore } from './order.store';
import { useFavoriteStore } from './favorite.store';
import { useAddressStore } from './address.store';
import { useCheckoutStore } from './checkout.store';
import { useTempOrderStore } from './temp-order.store';
import { initializeServices } from '@/services';

export {
    useUserStore,
    useProductStore,
    useCartStore,
    useOrderStore,
    useFavoriteStore,
    useAddressStore,
    useCheckoutStore,
    useTempOrderStore
};

// 初始化所有store 
// 使用Promise代替eventBus处理初始化流程
export async function initializeStores() {
    const userStore = useUserStore();
    const productStore = useProductStore();
    const cartStore = useCartStore();

    // 第一阶段：核心服务初始化
    await initializeServices();

    // 第二阶段：核心数据初始化
    await Promise.all([
        userStore.init(),
        productStore.init({ loadHomeDataOnly: true })
    ]);

    // 第三阶段：初始化购物车（所有用户都需要）
    await cartStore.initCart();

    // 第四阶段：仅对登录用户初始化其他服务
    if (userStore.isLoggedIn) {
        const favoriteStore = useFavoriteStore();
        const addressStore = useAddressStore();
        const checkoutStore = useCheckoutStore();
        const orderStore = useOrderStore();
        const tempOrderStore = useTempOrderStore();

        // 并行初始化各模块
        await Promise.all([
            favoriteStore.init(),
            addressStore.init(),
            orderStore.init(),
            checkoutStore.initCheckout(),
            tempOrderStore.init()
        ]);
    }

    return true;
}

// 用户登录后的处理
export async function onUserLogin() {
    const cartStore = useCartStore();
    const favoriteStore = useFavoriteStore();
    const addressStore = useAddressStore();
    const checkoutStore = useCheckoutStore();
    const tempOrderStore = useTempOrderStore();

    try {
        // 显式调用购物车同步方法
        await cartStore.fetchCartFromServer();
        await cartStore.mergeLocalCartToServer();

        // 并行初始化其他模块
        await Promise.all([
            favoriteStore.init(),
            addressStore.init(),
            checkoutStore.initCheckout(),
            tempOrderStore.init()
        ]);
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
    const tempOrderStore = useTempOrderStore();

    // 清除用户状态
    userStore.clearUserState();

    // 清除其他模块缓存
    addressStore.clearAddressCache();
    favoriteStore.clearFavoriteCache();
    orderStore.clearAllOrderCache();
    checkoutStore.clearCheckoutCache();
    tempOrderStore.clearTempOrder();

    // 注意：不清除购物车缓存，因为购物车数据应在未登录状态下保留
}