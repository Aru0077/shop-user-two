// src/utils/app-initializer.ts
import { serviceInitializer } from '@/core/service.init';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

/**
 * 应用初始化类
 * 负责协调应用整体初始化流程和UI层面的初始化
 */
export class AppInitializer {
      private static instance: AppInitializer;
      private initialized = false;

      public static getInstance(): AppInitializer {
            if (!AppInitializer.instance) {
                  AppInitializer.instance = new AppInitializer();
            }
            return AppInitializer.instance;
      }

      private constructor() { }

      public async initialize(): Promise<void> {
            if (this.initialized) {
                  console.info('应用已初始化，跳过');
                  return;
            }

            console.info('开始初始化应用...');

            try {
                  // 检查Token是否过期
                  const authStore = useAuthStore();
                  if (authStore.isLoggedIn && authService.isTokenExpired()) {
                        // Token已过期，静默处理
                        authService.handleTokenExpired(false);
                  }

                  // 确保核心服务层初始化完成
                  await serviceInitializer.initialize();

                  // 初始化UI层特定逻辑
                  this.initializeUI();

                  // 发布应用初始化完成事件
                  eventBus.emit(EVENT_NAMES.APP_INIT);

                  this.initialized = true;
                  console.info('应用初始化完成');

                  return Promise.resolve();

            } catch (error) {
                  console.error('应用初始化过程中发生错误:', error);
                  return Promise.reject(error);
            }
      }

      /**
       * 初始化UI相关功能
       */
      private initializeUI(): void {
            // 初始化路由守卫
            this.setupRouterGuards(); 
      }

      /**
       * 设置路由守卫
       */
      private setupRouterGuards(): void {
            // 实现路由守卫逻辑
            // 如：权限控制、页面切换动画等
      }

      public isInitialized(): boolean {
            return this.initialized;
      }
}

// 导出单例实例
export const appInitializer = AppInitializer.getInstance();

/**
 * 便捷初始化函数（保持向后兼容）
 */
export async function initializeApp(): Promise<void> {
      return appInitializer.initialize();

}