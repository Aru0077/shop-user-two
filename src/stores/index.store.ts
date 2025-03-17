// src/stores/index.store.ts
import { eventBus } from '@/utils/eventBus';
import { useUserStore } from './user.store';
import { useProductStore } from './product.store';
import { useCartStore } from './cart.store';
import { useOrderStore } from './order.store';
import { useFavoriteStore } from './favorite.store';
import { useAddressStore } from './address.store';
import { useCheckoutStore } from './checkout.store';

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
// 重构后的初始化方法，基于事件驱动
export async function initializeStores() {
    const userStore = useUserStore();
    const productStore = useProductStore();

    // 发布应用初始化开始事件
    eventBus.emit('app:initializing');

    // 第一阶段：核心数据初始化
    await Promise.all([
        userStore.init(),
        productStore.init({ loadHomeDataOnly: true })
    ]);

    // 第二阶段：延迟初始化非关键数据
    setTimeout(() => {
        const cartStore = useCartStore();
        cartStore.initCart();

        // 第三阶段：仅对登录用户初始化其他数据
        if (userStore.isLoggedIn) {
            setTimeout(() => {
                const favoriteStore = useFavoriteStore();
                const addressStore = useAddressStore();
                const orderStore = useOrderStore();

                // 并行初始化各模块
                Promise.all([
                    favoriteStore.init(),
                    addressStore.init(),
                    orderStore.init()
                ]).finally(() => {
                    // 所有初始化完成后，发布应用就绪事件
                    eventBus.emit('app:initialized');
                });
            }, 1000);
        } else {
            // 未登录用户，直接发布应用就绪事件
            eventBus.emit('app:initialized');
        }
    }, 500);
}


// 用户登录后的处理
export async function onUserLogin() {
    const cartStore = useCartStore();
    const favoriteStore = useFavoriteStore();
    const addressStore = useAddressStore();

    try {
        // 显式调用购物车同步方法
        await cartStore.fetchCartFromServer();
        await cartStore.mergeLocalCartToServer();

        // 并行初始化其他模块
        await Promise.all([
            favoriteStore.init(),
            addressStore.fetchAddresses(true)
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

    // 清除用户状态
    userStore.clearUserState();

    // 清除其他模块缓存
    addressStore.clearAddressCache();
    favoriteStore.clearFavoriteCache();
    orderStore.clearAllOrderCache();
    checkoutStore.clearCheckoutCache();
}