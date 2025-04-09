// src/stores/auth.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth.api';
import { storage } from '@/utils/storage';
import { createInitializeHelper } from '@/utils/store-helpers';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import { authService } from '@/services/auth.service';
import type {
      User,
      RegisterParams,
      LoginParams,
      LoginResponse,
      DeleteAccountParams
} from '@/types/user.type';
import type { ApiError } from '@/types/common.type';

/**
 * 认证状态管理
 * 统一管理用户认证、信息和登录状态
 */
export const useAuthStore = defineStore('auth', () => {
      // 初始化助手
      const initHelper = createInitializeHelper('AuthStore');

      // 状态
      const user = ref<User | null>(null);
      const token = ref<string | null>(null);
      const tokenExpiresAt = ref<number | null>(null);
      const loading = ref(false);
      const authLoading = ref(false);
      const facebookLoading = ref(false);
      const error = ref<string | null>(null);

      // 计算属性
      const isLoggedIn = computed(() => {
            return !!token.value && !!user.value;
      });

      const username = computed(() => {
            return user.value?.username || '';
      });

      const userId = computed(() => {
            return user.value?.id || '';
      });

      const isFacebookLinked = computed(() => {
            return isLoggedIn.value && !!user.value?.facebookId;
      });

      // 处理API错误
      function handleError(error: ApiError, customMessage?: string): void {
            console.error(`[AuthStore] Error:`, error);
            const message = customMessage || error.message || '发生未知错误';
            toast.error(message);
      }

      // 保存用户数据到本地存储
      function saveUserDataToStorage(): void {
            if (token.value) {
                  storage.saveUserToken(token.value, tokenExpiresAt.value || undefined);
            }

            if (user.value) {
                  storage.saveUserInfo(user.value);
            }
      }

      // 从本地存储加载用户数据
      function loadUserDataFromStorage(): boolean {
            const storedToken = storage.getUserToken();
            const storedUser = storage.getUserInfo<User>();
            const expiresAt = storage.getTokenExpiresAt();

            if (storedToken && storedUser) {
                  token.value = storedToken;
                  user.value = storedUser;
                  tokenExpiresAt.value = expiresAt;
                  return true;
            }

            return false;
      }

      // 清除本地存储中的用户数据
      function clearUserDataFromStorage(): void {
            storage.remove(storage.STORAGE_KEYS.TOKEN);
            storage.remove(storage.STORAGE_KEYS.USER_INFO);
      }

      // 用户注册
      async function register(params: RegisterParams): Promise<User | null> {
            try {
                  loading.value = true;
                  error.value = null;

                  const newUser = await authApi.register(params);

                  // 注册成功后自动登录
                  await login({
                        username: params.username,
                        password: params.password
                  });

                  // 发布注册成功事件
                  eventBus.emit(EVENT_NAMES.USER_REGISTER, newUser);

                  toast.success('注册成功');
                  return newUser;
            } catch (err: any) {
                  handleError(err, '注册失败');
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      // 用户常规登录
      async function login(params: LoginParams): Promise<LoginResponse | null> {
            try {
                  authLoading.value = true;
                  error.value = null;

                  const response = await authApi.login(params);

                  // 保存登录状态
                  token.value = response.token;
                  user.value = response.user;

                  // 保存Token过期时间
                  if (response.expiresAt) {
                        tokenExpiresAt.value = response.expiresAt;
                  }

                  // 保存到本地存储
                  saveUserDataToStorage();

                  // 发布登录成功事件
                  eventBus.emit(EVENT_NAMES.USER_LOGIN, response.user);

                  // 使用authService处理登录成功后的重定向
                  authService.handleLoginRedirect();

                  toast.success('登录成功');
                  return response;
            } catch (err: any) {
                  handleError(err, '登录失败');
                  return null;
            } finally {
                  authLoading.value = false;
            }
      }

      // Facebook令牌登录
      async function loginWithFacebook(accessToken: string): Promise<boolean> {
            try {
                  facebookLoading.value = true;
                  error.value = null;

                  const response = await authApi.loginWithFacebook(accessToken);

                  // 设置用户信息
                  token.value = response.token;
                  user.value = response.user;

                  // 保存token过期时间
                  if (response.expiresAt) {
                        tokenExpiresAt.value = response.expiresAt;
                  }

                  // 保存到本地存储
                  saveUserDataToStorage();

                  // 发布登录成功事件
                  eventBus.emit(EVENT_NAMES.USER_LOGIN, response.user);

                  toast.success('Facebook登录成功');
                  return true;
            } catch (err: any) {
                  const errorMessage = err.message || 'Facebook登录失败';
                  error.value = errorMessage;
                  toast.error(errorMessage);
                  return false;
            } finally {
                  facebookLoading.value = false;
            }
      }

      // 退出登录
      async function logout(): Promise<boolean> {
            if (!isLoggedIn.value) {
                  return true;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  // 检查是否通过Facebook登录
                  const isFacebookLogin = isFacebookLinked.value;

                  // 如果是通过Facebook登录，先调用Facebook退出
                  if (isFacebookLogin) {
                        try {
                              const { facebookUtils } = await import('@/utils/facebook.utils');
                              await facebookUtils.logout();
                              console.info('Facebook退出成功');
                        } catch (fbErr) {
                              console.error('Facebook退出失败:', fbErr);
                              // 继续执行本地退出，不中断流程
                        }
                  }

                  // 调用API登出
                  await authApi.logout();

                  // 清除状态
                  clearUserState();

                  // 发布登出事件
                  eventBus.emit(EVENT_NAMES.USER_LOGOUT);

                  toast.success('已退出登录');
                  return true;
            } catch (err: any) {
                  handleError(err, '退出登录失败');
                  return false;
            } finally {
                  loading.value = false;
            }
      }

      // 删除账号
      async function deleteAccount(params: DeleteAccountParams): Promise<boolean> {
            if (!isLoggedIn.value) {
                  toast.warning('请先登录');
                  return false;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  // 调用API删除账号
                  await authApi.deleteAccount(params);

                  // 清除状态
                  clearUserState();

                  // 发布登出事件
                  eventBus.emit(EVENT_NAMES.USER_LOGOUT);

                  toast.success('账号已删除');
                  return true;
            } catch (err: any) {
                  handleError(err, '删除账号失败');
                  return false;
            } finally {
                  loading.value = false;
            }
      }

      // 清除用户状态
      function clearUserState(): void {
            user.value = null;
            token.value = null;
            tokenExpiresAt.value = null;

            // 清除本地缓存
            clearUserDataFromStorage();
      }

      // 检查当前登录状态是否有效
      function checkAuthState(): boolean {
            if (!token.value || !user.value) {
                  return false;
            }

            // 使用authService检查Token是否过期
            const isExpired = authService.isTokenExpired();
            return !isExpired;
      }

      // 初始化认证模块
      async function init(force: boolean = false): Promise<void> {
            if (!initHelper.canInitialize(force)) {
                  return;
            }

            initHelper.startInitialization();

            try {
                  // 从本地存储加载用户数据
                  const hasUserData = loadUserDataFromStorage();

                  if (hasUserData) {
                        // 验证登录状态有效性
                        const isValid = checkAuthState();

                        if (!isValid) {
                              clearUserState();
                        } else {
                              // 发布登录事件，通知其他模块用户已登录
                              eventBus.emit(EVENT_NAMES.USER_LOGIN, user.value);
                        }
                  }

                  initHelper.completeInitialization();
            } catch (err) {
                  initHelper.failInitialization(err);
                  throw err;
            }
      }

      // 重置状态
      function resetState(): void {
            user.value = null;
            token.value = null;
            error.value = null;
            initHelper.resetInitialization();

            // 清除本地缓存
            clearUserDataFromStorage();
      }

      // 清除错误信息
      function clearError(): void {
            error.value = null;
      }

      return {
            // 状态
            user,
            token,
            loading,
            authLoading,
            facebookLoading,
            error,
            tokenExpiresAt,

            // 计算属性
            isLoggedIn,
            username,
            userId,
            isFacebookLinked,

            // 方法
            register,
            login,
            loginWithFacebook,
            logout,
            deleteAccount,
            clearUserState,
            checkAuthState,
            saveUserDataToStorage,
            loadUserDataFromStorage,
            init,
            resetState,
            clearError,

            // 初始化状态
            isInitialized: initHelper.isInitialized
      };
});