// src/api/facebook.api.ts
import http from '@/utils/request';
import type { FacebookLoginResponse } from '@/types/facebook.type';

/**
 * Facebook登录API
 */
export const facebookApi = {
      /**
       * 获取Facebook登录URL
       */
      getLoginUrl(): Promise<{ loginUrl: string }> {
            return http.get('/shop/facebook/auth-url');
      },

      /**
       * 使用授权码登录
       */
      handleCallback(code: string): Promise<FacebookLoginResponse> {
            return http.get(`/shop/facebook/callback?code=${code}`);
      },

      /**
       * 使用访问令牌登录
       */
      loginWithToken(accessToken: string): Promise<FacebookLoginResponse> {
            return http.post('/shop/facebook/token-login', { accessToken });
      }
};