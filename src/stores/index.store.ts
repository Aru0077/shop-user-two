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

      // 初始化产品数据（分类等）
      await productStore.init();

      // 如果用户已登录，初始化其他数据
      if (userStore.isLoggedIn) {
            // 并行初始化各模块数据
            await Promise.all([
                  cartStore.initCart(),
                  favoriteStore.init()
            ]);

            // 合并本地购物车到服务器
            await cartStore.mergeLocalCartToServer();
      } else {
            // 未登录时只初始化购物车
            await cartStore.initCart();
      }
}