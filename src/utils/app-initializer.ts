// src/utils/app-initializer.ts
import { initializeServices } from '@/services';
import {
      useUserStore, useProductStore, useCartStore,
      useOrderStore, useFavoriteStore, useAddressStore,
      useCheckoutStore, useTempOrderStore, usePromotionStore
} from '@/stores/index.store';
import { toast } from '@/utils/toast.service';

// 初始化阶段枚举
enum InitPhase {
      NONE = 0,
      SERVICES = 1,
      CORE_STORES = 2,
      USER_STORES = 3,
      COMPLETE = 4
}

// 初始化状态
let currentPhase = InitPhase.NONE;
let isInitializing = false;

/**
 * 应用初始化主函数 - 统一的入口点
 */
export async function initializeApp(): Promise<boolean> {
      // 避免重复初始化
      if (isInitializing) return false;
      if (currentPhase === InitPhase.COMPLETE) return true;

      isInitializing = true;

      try {
            // 第一阶段：初始化核心服务
            if (currentPhase < InitPhase.SERVICES) {
                  console.log('正在初始化核心服务...');
                  await initializeServices();
                  currentPhase = InitPhase.SERVICES;
            }

            // 第二阶段：初始化核心Store
            if (currentPhase < InitPhase.CORE_STORES) {
                  console.log('正在初始化核心Store...');
                  const userStore = useUserStore();
                  const productStore = useProductStore();
                  const cartStore = useCartStore();

                  // 确保用户状态已初始化
                  await userStore.init();

                  // 并行初始化产品和购物车
                  await Promise.all([
                        productStore.init({ loadHomeDataOnly: true }),
                        cartStore.initCart()
                  ]);

                  currentPhase = InitPhase.CORE_STORES;
            }

            // 第三阶段：如果用户已登录，初始化用户相关Store
            const userStore = useUserStore();
            if (currentPhase < InitPhase.USER_STORES && userStore.isLoggedIn) {
                  console.log('正在初始化用户相关Store...');
                  await initializeUserStores();
                  currentPhase = InitPhase.USER_STORES;
            }

            currentPhase = InitPhase.COMPLETE;
            console.log('应用初始化完成');
            return true;
      } catch (error) {
            console.error('应用初始化失败:', error);
            toast.error('应用初始化失败，请刷新页面重试');
            return false;
      } finally {
            isInitializing = false;
      }
}

/**
 * 初始化用户相关的Store
 */
export async function initializeUserStores(): Promise<boolean> {
      const userStore = useUserStore();

      if (!userStore.isLoggedIn) {
            console.warn('用户未登录，无法初始化用户相关Store');
            return false;
      }

      try {
            const favoriteStore = useFavoriteStore();
            const addressStore = useAddressStore();
            const checkoutStore = useCheckoutStore();
            const orderStore = useOrderStore();
            const tempOrderStore = useTempOrderStore();
            const promotionStore = usePromotionStore(); // 添加新的促销Store

            // 并行初始化各模块
            await Promise.all([
                  favoriteStore.init(),
                  addressStore.init(),
                  orderStore.init(),
                  checkoutStore.initCheckout(),
                  tempOrderStore.init(),
                  promotionStore.init() // 添加促销Store初始化
            ]);

            console.log('用户Store初始化完成');
            return true;
      } catch (error) {
            console.error('用户Store初始化失败:', error);
            return false;
      }
}

/**
 * 用户登录后调用，初始化用户相关服务和Store
 */
export async function onUserLogin(): Promise<void> {
      const cartStore = useCartStore();

      try {
            // 1. 先同步购物车
            await cartStore.mergeLocalCartToServer();

            // 2. 初始化用户相关Store
            await initializeUserStores();

            currentPhase = InitPhase.USER_STORES;
      } catch (error) {
            console.error('登录后初始化失败:', error);
      }
}

/**
 * 用户登出后调用，清理用户相关状态
 */
export function onUserLogout(): void {
      const userStore = useUserStore();
      const favoriteStore = useFavoriteStore();
      const addressStore = useAddressStore();
      const orderStore = useOrderStore();
      const checkoutStore = useCheckoutStore();
      const tempOrderStore = useTempOrderStore();
      const promotionStore = usePromotionStore(); // 添加新的促销Store

      // 清除用户状态
      userStore.clearUserState();

      // 清除其他模块缓存
      addressStore.clearAddressCache();
      favoriteStore.clearFavoriteCache();
      orderStore.clearAllOrderCache();
      checkoutStore.clearCheckoutCache();
      tempOrderStore.clearTempOrder();
      promotionStore.clearPromotionCache(); // 添加促销缓存清理

      // 注意：不清除购物车缓存，因为购物车数据应在未登录状态下保留

      // 重置初始化阶段
      currentPhase = InitPhase.CORE_STORES;
}