// src/utils/facebook.utils.ts
import { toast } from '@/utils/toast.service';
import type { FacebookAuthResponse, FacebookLoginOptions } from '@/types/facebook.type';

// 声明全局FB对象
declare global {
      interface Window {
            FB: any;
            fbAsyncInit: () => void;
      }
}

/**
 * Facebook SDK工具类
 */
export const facebookUtils = {
      /**
       * 加载Facebook SDK
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

                  // 加载Facebook SDK
                  (function (d, s, id) {
                        var js, fjs = d.getElementsByTagName(s)[0];
                        if (d.getElementById(id)) return;

                        js = d.createElement(s) as HTMLScriptElement; // 添加类型断言
                        js.id = id;
                        js.src = "https://connect.facebook.net/zh_CN/sdk.js";

                        if (fjs && fjs.parentNode) { // 添加空值检查
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

                  window.FB.getLoginStatus(function (response: FacebookAuthResponse) {
                        resolve(response);
                  });
            });
      },

      /**
       * 登录Facebook
       */
      login(options: FacebookLoginOptions = {}): Promise<FacebookAuthResponse> {
            return new Promise((resolve) => {
                  if (!window.FB) {
                        toast.error('Facebook SDK未初始化');
                        resolve({ status: 'unknown' });
                        return;
                  }

                  window.FB.login(function (response: FacebookAuthResponse) {
                        resolve(response);
                  }, options);
            });
      },

      /**
       * 退出登录
       */
      logout(): Promise<void> {
            return new Promise((resolve) => {
                  if (!window.FB) {
                        resolve();
                        return;
                  }

                  window.FB.logout(function () {
                        resolve();
                  });
            });
      },

      /**
       * 获取用户信息
       */
      getUserInfo(fields = 'name,email'): Promise<any> {
            return new Promise((resolve, reject) => {
                  if (!window.FB) {
                        reject(new Error('Facebook SDK未初始化'));
                        return;
                  }

                  window.FB.api('/me', { fields }, function (response: any) {
                        if (response && !response.error) {
                              resolve(response);
                        } else {
                              reject(response?.error || new Error('获取用户信息失败'));
                        }
                  });
            });
      }
};