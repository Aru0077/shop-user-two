// src/stores/index.ts
import { useUserStore } from './user.store';
import { useProductStore } from './product.store';
import { eventBus, AppEvents } from '@/utils/event-bus';

/**
 * 核心Store - 立即导出，用于首屏渲染
 * 这些Store会在应用初始化时立即加载
 */
export {
    useUserStore,
    useProductStore
};

/**
 * 懒加载Store - 仅在需要时导入
 * 这些函数返回Store的Promise，只有在调用时才会加载相应的模块
 */
export const lazyStores = {
    // 购物车Store - 懒加载
    useCartStore: () => import('./cart.store').then(module => module.useCartStore),

    // 收藏Store - 懒加载
    useFavoriteStore: () => import('./favorite.store').then(module => module.useFavoriteStore),

    // 地址Store - 懒加载
    useAddressStore: () => import('./address.store').then(module => module.useAddressStore),

    // 订单Store - 懒加载
    useOrderStore: () => import('./order.store').then(module => module.useOrderStore),

    // 结算Store - 懒加载
    useCheckoutStore: () => import('./checkout.store').then(module => module.useCheckoutStore),

    // 临时订单Store - 懒加载
    useTempOrderStore: () => import('./temp-order.store').then(module => module.useTempOrderStore),

    // 促销Store - 懒加载
    usePromotionStore: () => import('./promotion.store').then(module => module.usePromotionStore),

    // UI Store - 懒加载
    useUiStore: () => import('./ui.store').then(module => module.useUiStore)
};

/**
 * 初始化核心Store
 * 注册核心事件监听
 */
export async function initializeCoreStores(): Promise<void> {
    // 初始化用户Store
    const userStore = useUserStore();
    await userStore.init();

    // 初始化产品Store
    const productStore = useProductStore();
    await productStore.init({ loadHomeDataOnly: true });

    // 注册登录/登出事件处理
    eventBus.on(AppEvents.LOGIN, async () => {
        await initializeUserStores();
    });

    eventBus.on(AppEvents.LOGOUT, () => {
        // 在登出时，Store会通过事件监听自行清理状态
        console.log('重置Store状态');
    });
}

/**
 * 初始化用户相关Store
 * 仅在用户登录后调用
 */
export async function initializeUserStores(): Promise<void> {
    try {
        console.log('初始化用户相关Store...');

        // 并行加载所有用户相关Store
        const [
            useCart,
            useFavorite,
            useAddress,
            useOrder,
            useCheckout,
            useTempOrder,
            usePromotion
        ] = await Promise.all([
            lazyStores.useCartStore(),
            lazyStores.useFavoriteStore(),
            lazyStores.useAddressStore(),
            lazyStores.useOrderStore(),
            lazyStores.useCheckoutStore(),
            lazyStores.useTempOrderStore(),
            lazyStores.usePromotionStore()
        ]);

        // 创建Store实例并初始化
        const storeInitPromises = [
            useCart().initCart(),
            useFavorite().init(),
            useAddress().init(),
            useOrder().init(),
            useCheckout().initCheckout(),
            useTempOrder().init(),
            usePromotion().init()
        ];

        // 并行初始化所有Store
        await Promise.allSettled(storeInitPromises);

        console.log('用户Store初始化完成');
    } catch (error) {
        console.error('用户Store初始化失败:', error);
        eventBus.emit(AppEvents.UI_ERROR, '部分功能加载失败');
    }
}

// 为向后兼容而保留的导出对象
export default {
    useUserStore,
    useProductStore,
    // 使用函数包装而非直接导出，确保能够接收到动态加载的模块
    get useCartStore() { return lazyStores.useCartStore(); },
    get useFavoriteStore() { return lazyStores.useFavoriteStore(); },
    get useAddressStore() { return lazyStores.useAddressStore(); },
    get useOrderStore() { return lazyStores.useOrderStore(); },
    get useCheckoutStore() { return lazyStores.useCheckoutStore(); },
    get useTempOrderStore() { return lazyStores.useTempOrderStore(); },
    get usePromotionStore() { return lazyStores.usePromotionStore(); },
    get useUiStore() { return lazyStores.useUiStore(); }
};