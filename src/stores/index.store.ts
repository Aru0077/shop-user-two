// src/stores/index.ts
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
export async function initializeStores() {
    const userStore = useUserStore();
    const productStore = useProductStore();
    const cartStore = useCartStore();
    const favoriteStore = useFavoriteStore();
    const addressStore = useAddressStore();

    // 检查用户Token是否有效
    const isTokenValid = userStore.checkTokenExpiry();

    // 初始化产品数据（分类等）- 无论用户是否登录
    await productStore.init();

    // 如果用户已登录，初始化其他数据
    if (isTokenValid) {
        // 并行初始化各模块数据
        await Promise.all([
            cartStore.initCart(),
            favoriteStore.init(),
            addressStore.fetchAddresses()
        ]);

        // 合并本地购物车到服务器
        await cartStore.mergeLocalCartToServer();
    } else {
        // 未登录时只初始化购物车
        await cartStore.initCart();
    }
}

// 清除所有用户相关缓存
export function clearAllUserRelatedCaches() {
    const userStore = useUserStore();
//     const cartStore = useCartStore();
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
    
    // 不要清除购物车，它需要保留给未登录用户
    // 清除商品缓存，因为某些商品状态可能与用户相关
}

// 用户登录后的处理
export async function onUserLogin() {
    const cartStore = useCartStore();
    const favoriteStore = useFavoriteStore();
    const addressStore = useAddressStore();
    
    // 并行初始化各模块数据
    await Promise.all([
        cartStore.fetchCartFromServer(),
        favoriteStore.init(),
        addressStore.fetchAddresses(true) // 强制刷新
    ]);
    
    // 合并本地购物车到服务器
    await cartStore.mergeLocalCartToServer();
}