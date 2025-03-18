// src/stores/user.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { userApi } from '@/api/user.api';
import { storage } from '@/utils/storage';
import { eventBus } from '@/utils/eventBus';
import { authService } from '@/services/auth.service';
import type { LoginParams, RegisterParams, DeleteAccountParams } from '@/types/user.type';

// 缓存键 
const TOKEN_EXPIRY_KEY = 'user_token_expiry'; 

export const useUserStore = defineStore('user', () => {
      // 状态 
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);
      const isInitialized = ref<boolean>(false);
      const isInitializing = ref<boolean>(false);

      // 计算属性现在委托给 authService
      const isLoggedIn = computed(() => authService.isLoggedIn.value);
      const token = computed(() => authService.token.value);
      const currentUser = computed(() => authService.currentUser.value);

      // 添加init方法
      function init() {
            if (isInitialized.value || isInitializing.value) return;
            isInitializing.value = true;

            try {
                  // 使用 authService 初始化
                  const isValid = authService.init();
                  isInitialized.value = true;

                  // 发布初始化完成事件
                  eventBus.emit('user:initialized', isValid);

                  return isValid;
            } catch (err) {
                  console.error('用户状态初始化失败:', err);
                  eventBus.emit('app:error', { code: 1001, message: '用户状态初始化失败' });
            } finally {
                  isInitializing.value = false;
            }
      }


      // 登录
      async function login(params: LoginParams) {
            loading.value = true;
            authService.setLoading(true);
            error.value = null;
            authService.setError(null);

            try {
                  const response = await userApi.login(params);

                  // 使用 authService 设置登录状态
                  authService.setLoginState(response.token, response.user);

                  // 发布登录成功事件
                  eventBus.emit('user:login', { userId: response.user.id });

                  return response;
            } catch (err: any) {
                  error.value = err.message || '登录失败';
                  authService.setError(err.message || '登录失败');
                  eventBus.emit('app:error', { code: 1002, message: err.message || '登录失败' });
                  throw err;
            } finally {
                  loading.value = false;
                  authService.setLoading(false);
            }
      }

      // 注销
      async function logout() {
            try {
                  if (authService.token.value) {
                        await userApi.logout();
                  }
            } catch (err) {
                  console.error('退出登录时出错:', err);
            } finally {
                  // 使用 authService 清除登录状态
                  authService.clearLoginState();

                  // 发布登出事件
                  eventBus.emit('user:logout');
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

      // 检查token是否过期
      function checkTokenExpiry() {
            if (!token.value) return false;

            // 获取过期时间
            const expiryTime = storage.get<number>(TOKEN_EXPIRY_KEY, 0);

            // 如果没有过期时间或已过期
            if (!expiryTime || Date.now() >= expiryTime) {
                  clearUserState();
                  return false;
            }

            return true;
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
            checkTokenExpiry,
            refreshUserInfo
      };
});