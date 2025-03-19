// src/core/service.init.ts
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { useUserStore } from '@/stores/user.store';
import { useAddressStore } from '@/stores/address.store';
import { useProductStore } from '@/stores/product.store';
import { useCartStore } from '@/stores/cart.store';
import { useFavoriteStore } from '@/stores/favorite.store';
import { usePromotionStore } from '@/stores/promotion.store';
import { useTempOrderStore } from '@/stores/temp-order.store';

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
                  const userStore = useUserStore();
                  await userStore.init();

                  // 2. 初始化基础数据模块
                  const stores = [
                        useAddressStore(),
                        useProductStore(),
                        usePromotionStore()
                  ];

                  // 并行初始化基础模块
                  await Promise.all(stores.map(store => store.init()));

                  // 3. 初始化用户关联数据模块
                  const userDataStores = [
                        useCartStore(),
                        useFavoriteStore(),
                        useTempOrderStore()
                  ];

                  // 并行初始化用户数据模块
                  await Promise.all(userDataStores.map(store => store.init()));

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