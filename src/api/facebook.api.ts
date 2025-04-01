// src/api/facebook.api.ts
import http from '@/utils/request';
import type { FacebookLoginResponse } from '@/types/facebook.type';

/**
 * Facebook登录API
 */
export const facebookApi = {
    /**
     * 使用访问令牌登录
     */
    loginWithToken(accessToken: string): Promise<FacebookLoginResponse> {
        return http.post('/facebook/token-login', { accessToken });
    }
};