// src/types/user.type.ts

/**
 * 用户信息
 */
export interface User {
      id: string;
      username: string;
      password?: string; // 前端通常不处理密码，保持可选
      facebookId?: string; // 添加缺失的字段
      isBlacklist: number; // 添加缺失的字段
      createdAt: string; // 改为必需
      updatedAt: string; // 添加缺失的字段
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
      expiresAt: number;  
}

/**
 * 删除账号参数
 */
export interface DeleteAccountParams {
      password: string;
}