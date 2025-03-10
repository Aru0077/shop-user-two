// src/api/user.api.ts
import http from '@/utils/request';
import type { ApiResponse } from '@/types/common.type';
import type { User, RegisterParams, LoginParams, LoginResponse, DeleteAccountParams } from '@/types/user.type';

/**
 * 用户API
 */
export const userApi = {
      /**
       * 注册
       * @param params 注册参数
       */
      register(params: RegisterParams): Promise<ApiResponse<User>> {
            return http.post('/v1/shop/user/register', params);
      },

      /**
       * 登录
       * @param params 登录参数
       */
      login(params: LoginParams): Promise<ApiResponse<LoginResponse>> {
            return http.post('/v1/shop/user/login', params);
      },

      /**
       * 退出登录
       */
      logout(): Promise<ApiResponse<null>> {
            return http.post('/v1/shop/user/logout');
      },

      /**
       * 删除账号
       * @param params 删除账号参数
       */
      deleteAccount(params: DeleteAccountParams): Promise<ApiResponse<null>> {
            return http.delete('/v1/shop/user/account', { data: params });
      }
};