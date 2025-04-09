// src/services/auth.service.ts
import { toast } from '@/utils/toast.service'; 
import { useAuthStore } from '@/stores/auth.store';
import { cleanupHistory } from '@/utils/history';

class AuthService {
      private redirectUrl: string | null = null;
      private router: any = null;

      /**
       * 初始化路由实例
       */
      public setRouter(router: any): void {
            this.router = router;
      }

      /**
       * 保存重定向URL
       */
      public setRedirectUrl(url: string): void {
            this.redirectUrl = url;
            console.log('保存重定向URL:', url);
      }

      /**
       * 获取保存的重定向URL
       */
      public getRedirectUrl(): string | null {
            return this.redirectUrl;
      }

      /**
       * 清除重定向URL
       */
      public clearRedirectUrl(): void {
            this.redirectUrl = null;
      }

      /**
       * 检查Token是否过期
       */
      public isTokenExpired(): boolean {
            const authStore = useAuthStore();
            const expiresAt = authStore.tokenExpiresAt;

            if (!expiresAt) {
                  return true; // 没有过期时间，视为已过期
            }

            // 转换为秒
            const now = Math.floor(Date.now() / 1000);
            return now >= expiresAt;
      }

      /**
       * 处理Token过期的情况
       */
      public handleTokenExpired(showToast: boolean = true): void {
            const authStore = useAuthStore();

            // 清除用户状态
            authStore.clearUserState();

            // 显示提示消息
            if (showToast) {
                  toast.warning('登录已过期，请重新登录');
            }

            // 保存当前路径
            if (window.location.pathname !== '/login') {
                  this.setRedirectUrl(window.location.pathname + window.location.search);
            }

            // 重定向到登录页
            if (this.router) {
                  this.router.push('/login');
            } else {
                  window.location.href = '/login';
            }
      }

      /**
       * 处理登录成功后的重定向
       */
      public handleLoginRedirect(): void {
            if (!this.router) {
                  console.warn('Router未初始化，无法执行重定向');
                  return;
            }

            // 清理历史记录
            const clearHistoryFn = cleanupHistory([
                  'facebook.com',
                  'm.facebook.com',
                  '/login',
                  '/register'
            ]);

            if (clearHistoryFn) {
                  clearHistoryFn();
            }

            // 执行重定向
            const redirectTo = this.redirectUrl || '/home';
            this.router.replace(redirectTo);
            this.clearRedirectUrl();
      }
}

// 导出实例
export const authService = new AuthService();