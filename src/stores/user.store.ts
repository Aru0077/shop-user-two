// src/stores/user.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { userApi } from '@/api/user.api';
import { storage } from '@/utils/storage';
import type { User, LoginParams, RegisterParams, DeleteAccountParams } from '@/types/user.type';

// 缓存键
const TOKEN_KEY = 'user_token';
const USER_INFO_KEY = 'user_info';
// 缓存时间 (7天)
const AUTH_EXPIRY = 7 * 24 * 60 * 60 * 1000;

export const useUserStore = defineStore('user', () => {
      // 状态
      const token = ref<string | null>(storage.get(TOKEN_KEY, null));
      const currentUser = ref<User | null>(storage.get(USER_INFO_KEY, null));
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);
      
      // 计算属性
      const isLoggedIn = computed(() => !!token.value);

      // 登录
      async function login(params: LoginParams) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await userApi.login(params);

                  console.log("登录结果",response);
                  
                  // 更新状态
                  token.value = response.token;
                  currentUser.value = response.user;

                  // 使用storage工具持久化
                  storage.set(TOKEN_KEY, response.token, AUTH_EXPIRY);
                  storage.set(USER_INFO_KEY, response.user, AUTH_EXPIRY);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '登录失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 注销
      async function logout() {
            try {
                  if (token.value) {
                        await userApi.logout();
                  }
            } catch (err) {
                  console.error('退出登录时出错:', err);
            } finally {
                  // 即使API调用失败也清除本地状态
                  clearUserState();
            }
      }

      // 清除用户状态
      function clearUserState() {
            token.value = null;
            currentUser.value = null;

            // 使用storage工具删除缓存
            storage.remove(TOKEN_KEY);
            storage.remove(USER_INFO_KEY);
      }

      // 注册
      async function register(params: RegisterParams) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await userApi.register(params);
                  return response;
            } catch (err: any) {
                  error.value = err.message || '注册失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 删除账号
      async function deleteAccount(password: string) {
            loading.value = true;
            error.value = null;

            try {
                  const params: DeleteAccountParams = { password };
                  await userApi.deleteAccount(params);
                  clearUserState();
            } catch (err: any) {
                  error.value = err.message || '删除账号失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 检查token是否过期
      function checkTokenExpiry() {
            if (token.value && storage.has(TOKEN_KEY)) {
                  return true;
            }
            // Token不存在或已过期，清除状态
            if (token.value) {
                  clearUserState();
                  return false;
            }
            return false;
      }

      // 刷新用户信息
      async function refreshUserInfo() {
            // 这里可以添加获取最新用户信息的API调用
            // 目前API中没有提供这个方法，所以暂不实现
      }

      return {
            // 状态
            token,
            currentUser,
            loading,
            error,

            // 计算属性
            isLoggedIn,

            // 动作
            login,
            logout,
            register,
            deleteAccount,
            clearUserState,
            checkTokenExpiry,
            refreshUserInfo
      };
});