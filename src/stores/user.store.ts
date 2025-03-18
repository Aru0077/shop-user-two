// src/stores/user.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { userApi } from '@/api/user.api';
import type { RegisterParams, DeleteAccountParams } from '@/types/user.type';
import { authService } from '@/services/auth.service';

export const useUserStore = defineStore('user', () => {
      // 状态 
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);
      const isInitialized = ref<boolean>(false);
      const isInitializing = ref<boolean>(false);

      // 计算属性委托给 authService
      const isLoggedIn = computed(() => authService.isLoggedIn.value);
      const token = computed(() => authService.token.value);
      const currentUser = computed(() => authService.currentUser.value);

      // 初始化方法
      function init() {
            if (isInitialized.value || isInitializing.value) return;
            isInitializing.value = true;

            try {
                  // 使用 authService 初始化
                  const isValid = authService.init();
                  isInitialized.value = true;
                  return isValid;
            } catch (err) {
                  console.error('用户状态初始化失败:', err);
            } finally {
                  isInitializing.value = false;
            }
      }

      // 登录
      async function login(username: string, password: string) {
            loading.value = true;
            error.value = null;

            try {
                  const user = await authService.login(username, password);
                  return user;
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
                  await authService.logout();
            } catch (err) {
                  console.error('退出登录时出错:', err);
            }
      }

      // 清除用户状态
      function clearUserState() {
            authService.clearLoginState();
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

      // 刷新用户信息
      async function refreshUserInfo() {
            // 这里可以添加获取最新用户信息的API调用
            // 目前API中没有提供这个方法，所以暂不实现
      }

      return {
            // 状态
            isInitialized,
            isInitializing,
            token,
            currentUser,
            loading,
            error,

            // 计算属性
            isLoggedIn,

            // 动作
            init,
            login,
            logout,
            register,
            deleteAccount,
            clearUserState,
            refreshUserInfo
      };
});