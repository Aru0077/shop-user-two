// src/utils/app-initializer.ts
import { serviceInitializer } from '@/core/service.init';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { useFacebookStore } from '@/stores/facebook.store'; 

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
                  // 1. 处理可能的Facebook登录回调
                  await this.handleFacebookCallback();

                  // 1. 确保核心服务层初始化完成
                  await serviceInitializer.initialize();

                  // 2. 执行UI层特定的初始化逻辑
                  this.initializeUI();

                  // 3. 发布应用完全初始化完成事件
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
       * 处理Facebook登录回调
       */
      private async handleFacebookCallback(): Promise<void> {
            // 检查URL参数，处理Facebook回调
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const error = urlParams.get('error');
            const error_reason = urlParams.get('error_reason');

            // 如果当前是回调页面，特殊处理
            if (window.location.pathname === '/auth/facebook-callback' || 
                  window.location.pathname.endsWith('/auth/facebook-callback')) {
                  if (code && state) {
                        // 验证state以防止CSRF攻击
                        const savedState = localStorage.getItem('fb_login_state');
                        if (state === savedState) {
                              try {
                                    // 清除state
                                    localStorage.removeItem('fb_login_state');

                                    // 检查是否是弹窗回调
                                    if (window.opener && window.opener.fbCallbackHandler) {
                                          // 弹窗回调 - 向父窗口发送成功消息
                                          window.opener.fbCallbackHandler({ success: true, code });
                                          window.close();
                                          return;
                                    } else {
                                          // 重定向回调 - 处理登录
                                          const facebookStore = useFacebookStore();
                                          const success = await facebookStore.handleCallback(code);

                                          // 登录成功，重定向到原始路径
                                          if (success) {
                                                const redirectPath = sessionStorage.getItem('fb_redirect_path') || '/';
                                                sessionStorage.removeItem('fb_redirect_path');
                                                window.location.href = redirectPath;
                                                return;
                                          } else {
                                                window.location.href = '/login?error=facebook_auth_failed';
                                                return;
                                          }
                                    }
                              } catch (err) {
                                    console.error('处理Facebook回调失败:', err);

                                    // 处理弹窗或重定向的错误情况
                                    if (window.opener && window.opener.fbCallbackHandler) {
                                          window.opener.fbCallbackHandler({
                                                success: false,
                                                error: '登录处理失败'
                                          });
                                          window.close();
                                    } else {
                                          window.location.href = '/login?error=facebook_auth_error';
                                    }
                                    return;
                              }
                        } else {
                              // state验证失败，可能是CSRF攻击
                              console.error('Facebook登录状态验证失败');

                              if (window.opener && window.opener.fbCallbackHandler) {
                                    window.opener.fbCallbackHandler({
                                          success: false,
                                          error: '登录状态验证失败'
                                    });
                                    window.close();
                              } else {
                                    window.location.href = '/login?error=facebook_state_invalid';
                              }
                              return;
                        }
                  } else if (error) {
                        // 用户取消或登录错误
                        const errorMessage = error_reason || error || '登录取消或发生错误';
                        console.error('Facebook登录错误:', errorMessage);

                        if (window.opener && window.opener.fbCallbackHandler) {
                              window.opener.fbCallbackHandler({
                                    success: false,
                                    error: errorMessage
                              });
                              window.close();
                        } else {
                              window.location.href = `/login?error=${encodeURIComponent(errorMessage)}`;
                        }
                        return;
                  }
            }
      }

      /**
       * 初始化UI相关功能
       */
      private initializeUI(): void {
            // 初始化路由守卫
            this.setupRouterGuards();

            // 可添加其他UI层面初始化逻辑
            // 如：全局组件注册、主题初始化等
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