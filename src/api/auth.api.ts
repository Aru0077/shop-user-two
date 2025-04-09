// src/api/auth.api.ts
import http from '@/utils/request';
import type {
      User,
      RegisterParams,
      LoginParams,
      LoginResponse,
      DeleteAccountParams
} from '@/types/user.type';
import type { FacebookLoginResponse } from '@/types/facebook.type';

/**
 * 认证API
 * 统一管理用户认证、登录和账户相关功能
 */
export const authApi = {
      /**
       * 用户注册
       */
      register(params: RegisterParams): Promise<User> {
            return http.post('/user/register', params);
      },

      /**
       * 用户登录
       */
      login(params: LoginParams): Promise<LoginResponse> {
            return http.post('/user/login', params);
      },

      /**
       * 使用Facebook令牌登录
       */
      loginWithFacebook(accessToken: string): Promise<FacebookLoginResponse> {
            return http.post('/facebook/token-login', { accessToken });
      },

      /**
       * 退出登录
       */
      logout(): Promise<null> {
            return http.post('/user/logout');
      },

      /**
       * 删除账号
       */
      deleteAccount(params: DeleteAccountParams): Promise<null> {
            return http.delete('/user/account', { data: params });
      }
};