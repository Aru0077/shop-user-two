// src/core/service.init.ts
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { useAuthStore } from '@/stores/auth.store';
import { useAddressStore } from '@/stores/address.store';
import { useProductStore } from '@/stores/product.store';
import { useCartStore } from '@/stores/cart.store';
import { useFavoriteStore } from '@/stores/favorite.store';
import { usePromotionStore } from '@/stores/promotion.store'; 

/**
 * 核心服务初始化类
 * 负责所有数据和服务层模块的初始化
 */
export class ServiceInitializer {
      private static instance: ServiceInitializer;
      private initialized = false;

      public static getInstance(): ServiceInitializer {
            if (!ServiceInitializer.instance) {
                  ServiceInitializer.instance = new ServiceInitializer();
            }
            return ServiceInitializer.instance;
      }

      private constructor() { }

      public async initialize(): Promise<void> {
            if (this.initialized) {
                  console.info('核心服务已初始化，跳过');
                  return;
            }

            console.info('开始初始化核心服务...');

            try {
                  // 1. 初始化用户认证模块（最优先）
                  const authStore = useAuthStore();
                  await authStore.init();

                  // 2. 初始化基础数据模块（所有用户共用，不依赖登录状态）
                  const baseStores = [
                        useProductStore(),
                        usePromotionStore()
                  ];

                  // 并行初始化基础模块
                  await Promise.all(baseStores.map(store => store.init()));

                  // 3. 根据登录状态初始化用户相关数据模块
                  if (authStore.isLoggedIn) {
                        console.info('用户已登录，初始化用户相关数据模块');

                        const userDataStores = [
                              useAddressStore(),
                              useCartStore(),
                              useFavoriteStore(),
                        ];

                        // 并行初始化用户数据模块
                        await Promise.all(userDataStores.map(store => store.init()));
                  } else {
                        console.info('用户未登录，跳过用户相关数据模块初始化');
                  }

                  // 发布核心服务初始化完成事件
                  eventBus.emit(EVENT_NAMES.CORE_SERVICES_READY);

                  this.initialized = true;
                  console.info('核心服务初始化完成');
            } catch (error) {
                  console.error('核心服务初始化失败:', error);
                  throw error;
            }
      }

      public isInitialized(): boolean {
            return this.initialized;
      }
}

export const serviceInitializer = ServiceInitializer.getInstance();