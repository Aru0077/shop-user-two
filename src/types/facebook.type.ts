// src/types/facebook.type.ts
import type { User } from '@/types/user.type';

/**
 * Facebook授权响应
 */
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

/**
 * Facebook登录选项
 */
export interface FacebookLoginOptions {
      scope?: string;
      auth_type?: 'rerequest';
}

/**
 * Facebook登录响应
 */
export interface FacebookLoginResponse {
      token: string;
      user: User;
}

/**
 * Facebook API响应
 */
export interface FacebookApiResponse {
      id: string;
      name: string;
      email?: string;
}