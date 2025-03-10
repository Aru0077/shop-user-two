// src/types/user.type.ts

/**
 * 用户信息
 */
export interface User {
      id: string;
      username: string;
      createdAt?: string;
}

/**
 * 注册参数
 */
export interface RegisterParams {
      username: string;
      password: string;
}

/**
 * 登录参数
 */
export interface LoginParams {
      username: string;
      password: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
      token: string;
      user: User;
}

/**
 * 删除账号参数
 */
export interface DeleteAccountParams {
      password: string;
}