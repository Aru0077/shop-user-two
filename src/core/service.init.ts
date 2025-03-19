// src/core/service.init.ts
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { useUserStore } from '@/stores/user.store';
import { useAddressStore } from '@/stores/address.store';

/**
 * 服务初始化类
 * 负责协调各个模块的初始化
 */
export class ServiceInitializer {
      private static instance: ServiceInitializer;
      private initialized = false;

      /**
       * 获取服务初始化器实例（单例模式）
       */
      public static getInstance(): ServiceInitializer {
            if (!ServiceInitializer.instance) {
                  ServiceInitializer.instance = new ServiceInitializer();
            }
            return ServiceInitializer.instance;
      }

      /**
       * 私有构造函数，确保单例
       */
      private constructor() { }

      /**
       * 初始化所有模块
       */
      public async initialize(): Promise<void> {
            if (this.initialized) {
                  console.info('服务已初始化，跳过');
                  return;
            }

            console.info('开始初始化应用...');

            try {
                  // 初始化用户模块
                  const userStore = useUserStore();
                  await userStore.init();

                  // 初始化地址模块
                  const addressStore = useAddressStore();
                  await addressStore.init();

                  // 在这里可以添加其他模块的初始化

                  // 发布应用初始化完成事件
                  eventBus.emit(EVENT_NAMES.APP_INIT);

                  this.initialized = true;
                  console.info('应用初始化完成');
            } catch (error) {
                  console.error('应用初始化失败:', error);
                  throw error;
            }
      }

      /**
       * 检查是否已初始化
       */
      public isInitialized(): boolean {
            return this.initialized;
      }
}

// 导出单例实例
export const serviceInitializer = ServiceInitializer.getInstance();