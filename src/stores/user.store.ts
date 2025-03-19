// src/stores/user.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/index.api';
import { storage } from '@/utils/storage';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import type { User, RegisterParams, LoginParams, DeleteAccountParams, LoginResponse } from '@/types/user.type';
import type { ApiError } from '@/types/common.type';
import { createInitializeHelper } from '@/utils/store-helpers';

/**
 * 用户状态存储与服务
 * 集成状态管理和业务逻辑
 */
export const useUserStore = defineStore('user', () => {
      // 创建初始化助手
      const initHelper = createInitializeHelper('UserStore');

      // ==================== 状态 ====================
      const user = ref<User | null>(null);
      const token = ref<string | null>(null);
      const loading = ref<boolean>(false);

      // ==================== Getters ====================
      const isLoggedIn = computed(() => !!token.value);
      const username = computed(() => user.value?.username || '');

      // ==================== 内部工具方法 ====================
      /**
       * 处理API错误
       * @param error API错误
       * @param customMessage 自定义错误消息
       */
      function handleError(error: ApiError, customMessage?: string): void {
            console.error(`[UserStore] Error:`, error);

            // 显示错误提示
            const message = customMessage || error.message || '发生未知错误';
            toast.error(message);
      }

      /**
       * 设置事件监听
       */
      function setupEventListeners(): void {
            // 监听全局初始化事件
            eventBus.on(EVENT_NAMES.APP_INIT, () => {
                  // 系统初始化时可以进行的操作，例如恢复用户会话
                  restoreUserSession();
            });
      }

      // ==================== 状态管理方法 ====================
      /**
       * 设置用户信息
       */
      function setUser(userData: User | null) {
            user.value = userData;
      }

      /**
       * 设置用户令牌
       */
      function setToken(newToken: string | null) {
            token.value = newToken;
      }

      /**
       * 设置加载状态
       */
      function setLoading(isLoading: boolean) {
            loading.value = isLoading;
      }

      /**
       * 清除用户状态
       */
      function clearUserState() {
            user.value = null;
            token.value = null;

            // 清除本地存储中的用户信息
            storage.remove(storage.STORAGE_KEYS.TOKEN);
            storage.remove(storage.STORAGE_KEYS.USER_INFO);
      }

      // ==================== 业务逻辑方法（原服务方法）====================
      /**
       * 恢复用户会话
       */
      async function restoreUserSession(): Promise<void> {
            const storedToken = storage.getUserToken();
            const userInfo = storage.getUserInfo<User>();

            if (storedToken && userInfo) {
                  setToken(storedToken);
                  setUser(userInfo);

                  // 发布用户登录事件，通知其他模块用户已登录 
                  eventBus.emit(EVENT_NAMES.USER_LOGIN, { user: userInfo, token: storedToken });
                  // 增加日志帮助调试
                  console.info('已恢复用户登录状态:', userInfo.username);
            }
      }

      /**
       * 用户注册
       * @param params 注册参数
       */
      async function register(params: RegisterParams): Promise<User | null> {
            setLoading(true);

            try {
                  const newUser = await api.userApi.register(params);

                  // 发布用户注册事件
                  eventBus.emit(EVENT_NAMES.USER_REGISTER, { user: newUser });

                  toast.success('注册成功');
                  return newUser;
            } catch (error: any) {
                  handleError(error, '注册失败');
                  return null;
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 用户登录
       * @param params 登录参数
       */
      async function login(params: LoginParams): Promise<LoginResponse | null> {
            if (loading.value) {
                  return null; // 登录操作不应重复，直接返回null
            }
            setLoading(true);

            try {
                  const response = await api.userApi.login(params);

                  // 保存用户信息和令牌到本地存储
                  storage.saveUserToken(response.token);
                  storage.saveUserInfo(response.user);

                  // 更新状态
                  setUser(response.user);
                  setToken(response.token);

                  // 发布用户登录事件
                  eventBus.emit(EVENT_NAMES.USER_LOGIN, { user: response.user, token: response.token });

                  toast.success('登录成功');
                  return response;
            } catch (error: any) {
                  handleError(error, '登录失败');
                  return null;
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 用户退出登录
       */
      async function logout(): Promise<boolean> {
            setLoading(true);

            try {
                  await api.userApi.logout();

                  // 清除用户状态
                  clearUserState();

                  // 发布用户登出事件
                  eventBus.emit(EVENT_NAMES.USER_LOGOUT);

                  toast.success('已退出登录');
                  return true;
            } catch (error: any) {
                  handleError(error, '退出登录失败');
                  return false;
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 删除用户账号
       * @param params 删除账号参数
       */
      async function deleteAccount(params: DeleteAccountParams): Promise<boolean> {
            setLoading(true);

            try {
                  await api.userApi.deleteAccount(params);

                  // 清除用户状态
                  clearUserState();

                  // 发布用户登出事件
                  eventBus.emit(EVENT_NAMES.USER_LOGOUT);

                  toast.success('账号已删除');
                  return true;
            } catch (error: any) {
                  handleError(error, '删除账号失败');
                  return false;
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 初始化用户模块
       */
      async function init(): Promise<void> {
            if (!initHelper.canInitialize()) {
                  return;
            }

            initHelper.startInitialization();

            try {
                  await restoreUserSession();
                  // 初始化成功
                  initHelper.completeInitialization();
            } catch (error) {
                  initHelper.failInitialization(error);
                  throw error;
            }
      }


      // 立即初始化存储和事件监听
      setupEventListeners();

      return {
            // 状态
            user,
            token,
            loading,

            // Getters
            isLoggedIn,
            username,

            // 状态管理方法
            setUser,
            setToken,
            setLoading,
            clearUserState,

            // 业务逻辑方法
            register,
            login,
            logout,
            deleteAccount,
            restoreUserSession,
            init,
            isInitialized: initHelper.isInitialized
      };
});