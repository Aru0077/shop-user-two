// src/services/auth.service.ts
import { BaseService } from '@/core/base.service';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { useUserStore } from '@/stores/user.store';
import { storage } from '@/utils/storage';
import { toast } from '@/utils/toast.service';
import router from '@/router';

/**
 * 认证服务
 * 负责统一处理登录状态、Token过期等认证相关逻辑
 */
export class AuthService extends BaseService {
      protected readonly serviceName = 'AuthService';
      private static instance: AuthService;
      private redirectUrl: string | null = null;

      private constructor() {
            super();
      }

      /**
       * 获取单例实例
       */
      public static getInstance(): AuthService {
            if (!AuthService.instance) {
                  AuthService.instance = new AuthService();
            }
            return AuthService.instance;
      }

      /**
       * 处理Token过期
       * 集中处理所有Token过期的相关逻辑
       */
      public handleTokenExpired(showToast: boolean = true): void {
            // 获取当前路由路径（用于后续可能的重定向）
            const currentPath = router.currentRoute.value.fullPath;
            const isLoginPage = currentPath.includes('/login');

            // 保存当前URL（如果不是登录页面且不是首页）
            if (!isLoginPage && currentPath !== '/' && currentPath !== '/home') {
                  this.redirectUrl = currentPath;
            }

            // 获取用户Store并清理状态
            const userStore = useUserStore();
            userStore.clearUserState();

            // 清除认证相关的缓存（不需要清除所有缓存）
            this.clearAuthCache();

            // 显示提示消息
            if (showToast) {
                  toast.warning('登录已过期，请重新登录');
            }

            // 发布登出事件
            eventBus.emit(EVENT_NAMES.USER_LOGOUT);

            // 只有当前不在登录页时才跳转到登录页
            if (!isLoginPage) {
                  router.replace({
                        path: '/login',
                        query: this.redirectUrl ? { redirect: this.redirectUrl } : {}
                  });
            }
      }

      /**
       * 检查Token是否过期
       */
      public isTokenExpired(): boolean {
            const tokenExpiresAt = storage.getTokenExpiresAt();
            if (!tokenExpiresAt) {
                  return true;
            }

            const currentTimestamp = Math.floor(Date.now() / 1000);
            return currentTimestamp >= tokenExpiresAt;
      }

      /**
       * 清除认证相关的缓存
       * 只清除与认证相关的缓存，不清除其他可重用的缓存
       */
      private clearAuthCache(): void {
            storage.remove(storage.STORAGE_KEYS.TOKEN);
            storage.remove(storage.STORAGE_KEYS.USER_INFO);
            storage.remove(storage.STORAGE_KEYS.CART_DATA);
            storage.remove(storage.STORAGE_KEYS.ADDRESSES);
            storage.remove(storage.STORAGE_KEYS.FAVORITE_IDS);
            storage.remove(storage.STORAGE_KEYS.FAVORITES_LIST);
            storage.removeByPrefix(storage.STORAGE_KEYS.ORDER_LIST);
            storage.removeByPrefix(storage.STORAGE_KEYS.ORDER_DETAIL_PREFIX);
      }

      /**
       * 获取重定向URL
       */
      public getRedirectUrl(): string | null {
            return this.redirectUrl;
      }

      /**
       * 设置重定向URL
       */
      public setRedirectUrl(url: string | null): void {
            this.redirectUrl = url;
      }

      /**
       * 处理登录成功后的重定向
       */
      public handleLoginRedirect(): void {
            if (this.redirectUrl) {
                  router.replace(this.redirectUrl);
                  this.redirectUrl = null;
            } else {
                  router.replace('/home');
            }
      }
}

// 导出单例实例
export const authService = AuthService.getInstance();