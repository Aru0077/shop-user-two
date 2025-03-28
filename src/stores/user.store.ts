// src/stores/user.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { userApi } from '@/api/user.api';
import { storage } from '@/utils/storage';
import { createInitializeHelper } from '@/utils/store-helpers';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import type { User, RegisterParams, LoginParams, LoginResponse, DeleteAccountParams } from '@/types/user.type';
import type { ApiError } from '@/types/common.type';

/**
 * 用户状态管理
 * 负责用户认证、信息管理、登录状态维护
 */
export const useUserStore = defineStore('user', () => {
      // 初始化助手
      const initHelper = createInitializeHelper('UserStore');

      // 状态
      const user = ref<User | null>(null);
      const token = ref<string | null>(null);
      const loading = ref(false);
      const loginLoading = ref(false);
      const registerLoading = ref(false);
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

      // ==================== 内部工具方法 ====================
      /**
       * 处理API错误
       */
      function handleError(error: ApiError, customMessage?: string): void {
            console.error(`[UserStore] Error:`, error);
            const message = customMessage || error.message || '发生未知错误';
            toast.error(message);
      }

      /**
       * 保存用户数据到本地存储
       */
      function saveUserDataToStorage(): void {
            if (token.value) {
                  storage.saveUserToken(token.value);
            }

            if (user.value) {
                  storage.saveUserInfo(user.value);
            }
      }

      /**
       * 从本地存储加载用户数据
       */
      function loadUserDataFromStorage(): boolean {
            const storedToken = storage.getUserToken();
            const storedUser = storage.getUserInfo<User>();

            if (storedToken && storedUser) {
                  token.value = storedToken;
                  user.value = storedUser;
                  return true;
            }

            return false;
      }

      /**
       * 清除本地存储中的用户数据
       */
      function clearUserDataFromStorage(): void {
            storage.remove(storage.STORAGE_KEYS.TOKEN);
            storage.remove(storage.STORAGE_KEYS.USER_INFO);
      }

      // ==================== 业务逻辑方法 ====================
      /**
       * 用户注册
       */
      async function register(params: RegisterParams): Promise<User | null> {
            try {
                  registerLoading.value = true;
                  error.value = null;

                  const newUser = await userApi.register(params);

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
                  registerLoading.value = false;
            }
      }

      /**
       * 用户登录
       */
      async function login(params: LoginParams): Promise<LoginResponse | null> {
            try {
                  loginLoading.value = true;
                  error.value = null;

                  const response = await userApi.login(params);

                  // 保存登录状态
                  token.value = response.token;
                  user.value = response.user;

                  // 保存到本地存储
                  saveUserDataToStorage();

                  // 发布登录成功事件
                  eventBus.emit(EVENT_NAMES.USER_LOGIN, response.user);

                  toast.success('登录成功');
                  return response;
            } catch (err: any) {
                  handleError(err, '登录失败');
                  return null;
            } finally {
                  loginLoading.value = false;
            }
      }

      /**
       * 用户登出
       */
      async function logout(): Promise<boolean> {
            if (!isLoggedIn.value) {
                  return true;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  // 调用API登出
                  await userApi.logout();

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

      /**
       * 删除账号
       */
      async function deleteAccount(params: DeleteAccountParams): Promise<boolean> {
            if (!isLoggedIn.value) {
                  toast.warning('请先登录');
                  return false;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  // 调用API删除账号
                  await userApi.deleteAccount(params);

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

      /**
       * 清除用户状态
       */
      function clearUserState(): void {
            user.value = null;
            token.value = null;

            // 清除本地存储
            clearUserDataFromStorage();
      }

      /**
       * 检查当前登录状态是否有效
       */
      function checkAuthState(): boolean {
            if (!token.value || !user.value) {
                  return false;
            }

            // 可以添加Token有效期检查等逻辑
            return true;
      }

      /**
       * 初始化用户模块
       */
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

      /**
       * 重置状态
       */
      function resetState(): void {
            user.value = null;
            token.value = null;
            error.value = null;
            initHelper.resetInitialization();

            // 清除本地缓存
            clearUserDataFromStorage();
      }

      return {
            // 状态
            user,
            token,
            loading,
            loginLoading,
            registerLoading,
            error,

            // 计算属性
            isLoggedIn,
            username,
            userId,

            // 方法
            register,
            login,
            logout,
            deleteAccount,
            clearUserState,
            checkAuthState,
            saveUserDataToStorage,
            loadUserDataFromStorage,
            init,
            resetState,

            // 初始化状态
            isInitialized: initHelper.isInitialized
      };
});