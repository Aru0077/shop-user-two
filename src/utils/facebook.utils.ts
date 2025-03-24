// src/utils/facebook.utils.ts
import { toast } from '@/utils/toast.service';

// Facebook SDK 类型定义
declare global {
      interface Window {
            fbAsyncInit: () => void;
            FB: {
                  init: (options: {
                        appId: string;
                        cookie?: boolean;
                        xfbml?: boolean;
                        version: string;
                  }) => void;
                  login: (
                        callback: (response: FacebookAuthResponse) => void,
                        options?: FacebookLoginOptions
                  ) => void;
                  getLoginStatus: (
                        callback: (response: FacebookAuthResponse) => void
                  ) => void;
                  logout: (callback: (response: any) => void) => void;
                  api: (
                        path: string,
                        params: any,
                        callback: (response: any) => void
                  ) => void;
            };
      }
}

// Facebook 响应类型定义
export interface FacebookAuthResponse {
      status: 'connected' | 'not_authorized' | 'unknown';
      authResponse?: {
            accessToken: string;
            expiresIn: string;
            reauthorize_required_in: string;
            signedRequest: string;
            userID: string;
      };
}

// Facebook 登录选项类型定义
export interface FacebookLoginOptions {
      scope?: string;
      auth_type?: 'rerequest';
      return_scopes?: boolean;
}

/**
 * Facebook SDK 工具类
 */
export const facebookUtils = {
      /**
       * 加载 Facebook SDK
       */
      loadSDK(): Promise<void> {
            return new Promise((resolve) => {
                  // 如果已经加载，直接返回
                  if (window.FB) {
                        resolve();
                        return;
                  }

                  // 定义加载完成回调
                  window.fbAsyncInit = function () {
                        window.FB.init({
                              appId: import.meta.env.VITE_FACEBOOK_APP_ID,
                              cookie: true,
                              xfbml: true,
                              version: 'v22.0'
                        });
                        resolve();
                  };

                  // 加载 Facebook SDK
                  (function (d, s, id) {
                        const fjs = d.getElementsByTagName(s)[0];
                        if (d.getElementById(id)) return;

                        const js = d.createElement(s) as HTMLScriptElement;
                        js.id = id;
                        js.src = "https://connect.facebook.net/en_US/sdk.js";

                        if (fjs && fjs.parentNode) {
                              fjs.parentNode.insertBefore(js, fjs);
                        }
                  }(document, 'script', 'facebook-jssdk'));
            });
      },

      /**
       * 获取登录状态
       */
      getLoginStatus(): Promise<FacebookAuthResponse> {
            return new Promise((resolve) => {
                  if (!window.FB) {
                        resolve({ status: 'unknown' });
                        return;
                  }

                  window.FB.getLoginStatus((response) => {
                        resolve(response);
                  });
            });
      },

      /**
       * 登录 Facebook
       */
      login(options: FacebookLoginOptions = { scope: 'public_profile' }): Promise<FacebookAuthResponse> {
            return new Promise((resolve, reject) => {
                  if (!window.FB) {
                        toast.error('Facebook SDK 未初始化');
                        resolve({ status: 'unknown' });
                        return;
                  }

                  try {
                        window.FB.login((response) => {
                              resolve(response);
                        }, options);
                  } catch (error) {
                        reject(error);
                  }
            });
      },

      /**
       * 退出登录
       */
      logout(): Promise<void> {
            return new Promise((resolve, reject) => {
                  if (!window.FB) {
                        resolve();
                        return;
                  }

                  try {
                        window.FB.logout(() => {
                              resolve();
                        });
                  } catch (error) {
                        reject(error);
                  }
            });
      },

      /**
       * 获取用户信息
       */
      getUserInfo(fields = 'id,name'): Promise<any> {
            return new Promise((resolve, reject) => {
                  if (!window.FB) {
                        reject(new Error('Facebook SDK 未初始化'));
                        return;
                  }

                  window.FB.api('/me', { fields }, (response) => {
                        if (response && !response.error) {
                              resolve(response);
                        } else {
                              reject(response?.error || new Error('获取用户信息失败'));
                        }
                  });
            });
      }
};