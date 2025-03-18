// src/services/auth.service.ts
import { ref, computed, readonly } from 'vue';
import { storage } from '@/utils/storage';
import { eventBus } from '@/utils/eventBus';
import type { User } from '@/types/user.type';

// 缓存键，保持与 userStore 一致
const TOKEN_KEY = 'user_token';
const TOKEN_EXPIRY_KEY = 'user_token_expiry';
const USER_INFO_KEY = 'user_info';

// 默认过期时间 (7天)
const AUTH_EXPIRY = 7 * 24 * 60 * 60 * 1000;

class AuthService {
      // 私有状态，不允许外部直接修改
      private _token = ref<string | null>(storage.get(TOKEN_KEY, null));
      private _currentUser = ref<User | null>(storage.get(USER_INFO_KEY, null));
      private _loading = ref<boolean>(false);
      private _error = ref<string | null>(null);
      private _isInitialized = ref<boolean>(false);
      private _isInitializing = ref<boolean>(false);

      // 暴露给外部的只读状态
      public token = readonly(this._token);
      public currentUser = readonly(this._currentUser);
      public loading = readonly(this._loading);
      public error = readonly(this._error);
      public isInitialized = readonly(this._isInitialized);

      // 计算属性：登录状态
      public isLoggedIn = computed(() => !!this._token.value && this.checkTokenValidity());

      // 状态变化监听器
      private listeners: Map<string, Set<Function>> = new Map([
            ['login', new Set()],
            ['logout', new Set()],
            ['change', new Set()]
      ]);

      constructor() {
            // 监听来自 userStore 的事件，保持状态同步
            // 这是为了确保与现有代码的兼容性
            eventBus.on('user:login', ({ userId }) => {
                  // 不需要在这里设置状态，因为 userStore 的 login 方法会调用 this.setLoginState
                  this.notifyListeners('login', userId);
            });

            eventBus.on('user:logout', () => {
                  // 不需要在这里设置状态，因为 userStore 的 logout 方法会调用 this.clearLoginState
                  this.notifyListeners('logout');
            });

            eventBus.on('user:initialized', (isLoggedIn) => {
                  this._isInitialized.value = true;
                  this.notifyListeners('change', isLoggedIn);
            });
      }

      /**
       * 初始化认证状态
       */
      public init(): boolean {
            if (this._isInitialized.value || this._isInitializing.value) return this.isLoggedIn.value;

            this._isInitializing.value = true;

            try {
                  // 检查 token 是否有效
                  const isValid = this.checkTokenValidity();
                  this._isInitialized.value = true;

                  // 通知状态变化
                  this.notifyListeners('change', isValid);

                  return isValid;
            } catch (err) {
                  console.error('认证状态初始化失败:', err);
                  return false;
            } finally {
                  this._isInitializing.value = false;
            }
      }

      /**
       * 检查 token 是否有效
       */
      private checkTokenValidity(): boolean {
            if (!this._token.value) return false;

            // 获取过期时间
            const expiryTime = storage.get<number>(TOKEN_EXPIRY_KEY, 0);

            // 如果没有过期时间或已过期
            if (!expiryTime || Date.now() >= expiryTime) {
                  this.clearLoginState();
                  return false;
            }

            return true;
      }

      /**
       * 设置登录状态
       */
      public setLoginState(token: string, user: User): void {
            this._token.value = token;
            this._currentUser.value = user;

            // 计算 token 过期时间
            const expiryTime = Date.now() + AUTH_EXPIRY;

            // 持久化存储
            storage.set(TOKEN_KEY, token, AUTH_EXPIRY);
            storage.set(TOKEN_EXPIRY_KEY, expiryTime, AUTH_EXPIRY);
            storage.set(USER_INFO_KEY, user, AUTH_EXPIRY);

            // 通知状态变化
            this.notifyListeners('login', user.id);
            this.notifyListeners('change', true);
      }

      /**
       * 清除登录状态
       */
      public clearLoginState(): void {
            this._token.value = null;
            this._currentUser.value = null;

            storage.remove(TOKEN_KEY);
            storage.remove(TOKEN_EXPIRY_KEY);
            storage.remove(USER_INFO_KEY);

            // 通知状态变化
            this.notifyListeners('logout');
            this.notifyListeners('change', false);
      }

      /**
       * 添加状态变化监听器
       * @param event 监听的事件类型: 'login', 'logout', 'change'
       * @param callback 回调函数
       * @returns 取消监听的函数
       */
      public on(event: 'login' | 'logout' | 'change', callback: Function): () => void {
            const listeners = this.listeners.get(event);
            if (listeners) {
                  listeners.add(callback);
            }

            // 返回取消监听的函数
            return () => {
                  const listeners = this.listeners.get(event);
                  if (listeners) {
                        listeners.delete(callback);
                  }
            };
      }

      /**
       * 通知所有特定事件的监听器
       */
      private notifyListeners(event: 'login' | 'logout' | 'change', ...args: any[]): void {
            const listeners = this.listeners.get(event);
            if (listeners) {
                  listeners.forEach(callback => callback(...args));
            }
      }

      /**
       * 设置错误状态
       */
      public setError(message: string | null): void {
            this._error.value = message;
      }

      /**
       * 设置加载状态
       */
      public setLoading(loading: boolean): void {
            this._loading.value = loading;
      }
}

// 创建单例
export const authService = new AuthService();

// 初始化认证状态
authService.init();