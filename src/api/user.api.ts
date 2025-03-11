// src/api/user.api.ts
import http from '@/utils/request';
import type { User, RegisterParams, LoginParams, LoginResponse, DeleteAccountParams } from '@/types/user.type';

/**
 * 用户API
 */
export const userApi = {
      /**
       * 注册
       * @param params 注册参数
       */
      register(params: RegisterParams): Promise<User> {
            return http.post('/user/register', params);
      },

      /**
       * 登录
       * @param params 登录参数
       */
      login(params: LoginParams): Promise<LoginResponse> {
            return http.post('/user/login', params);
      },

      /**
       * 退出登录
       */
      logout(): Promise<null> {
            return http.post('/user/logout');
      },

      /**
       * 删除账号
       * @param params 删除账号参数
       */
      deleteAccount(params: DeleteAccountParams): Promise<null> {
            return http.delete('/user/account', { data: params });
      }
};