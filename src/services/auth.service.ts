// src/services/auth.service.ts
import { ref, computed, readonly } from 'vue';
import { storage, STORAGE_KEYS, STORAGE_EXPIRY } from '@/utils/storage';
import type { User } from '@/types/user.type';
import { userApi } from '@/api/user.api';
import { onUserLogin, onUserLogout } from '@/utils/app-initializer';

// 状态变化回调类型
type AuthStateChangeCallback = (isLoggedIn: boolean) => void;
type LoginCallback = (userId: string) => void;
type LogoutCallback = () => void;

class AuthService {
      // 私有状态，不允许外部直接修改
      private _token = ref<string | null>(storage.getUserToken());
      private _currentUser = ref<User | null>(storage.getUserInfo<User>());
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

      // 状态变化回调
      private loginCallbacks: Set<LoginCallback> = new Set();
      private logoutCallbacks: Set<LogoutCallback> = new Set();
      private stateChangeCallbacks: Set<AuthStateChangeCallback> = new Set();

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
                  this.notifyStateChange(isValid);

                  return isValid;
            } catch (err) {
                  console.error('认证状态初始化失败:', err);
                  return false;
            } finally {
                  this._isInitializing.value = false;
            }
      }

      // 类构造函数中添加
      constructor() {
            // 添加登录/登出事件处理
            this.onLogin(() => {
                  // 用户登录时调用统一的用户登录初始化
                  onUserLogin();
            });

            this.onLogout(() => {
                  // 用户登出时调用统一的用户登出清理
                  onUserLogout();
            });
      }

      /**
       * 检查 token 是否有效
       */
      private checkTokenValidity(): boolean {
            if (!this._token.value) return false;

            // 获取过期时间
            const expiryTime = storage.get<number>(STORAGE_KEYS.TOKEN_EXPIRY, 0);

            // 如果没有过期时间或已过期
            if (!expiryTime || Date.now() >= expiryTime) {
                  this.clearLoginState();
                  return false;
            }

            return true;
      }

      /**
       * 检查 token 是否过期
       */
      public checkTokenExpiry(): boolean {
            return this.checkTokenValidity();
      }

      /**
       * 登录
       * @param username 用户名
       * @param password 密码
       */
      public async login(username: string, password: string): Promise<User> {
            this._loading.value = true;
            this._error.value = null;

            try {
                  const response = await userApi.login({ username, password });

                  // 设置登录状态
                  this.setLoginState(response.token, response.user);

                  return response.user;
            } catch (err: any) {
                  this._error.value = err.message || '登录失败';
                  throw err;
            } finally {
                  this._loading.value = false;
            }
      }

      /**
       * 注销
       */
      public async logout(): Promise<void> {
            try {
                  if (this._token.value) {
                        await userApi.logout();
                  }
            } catch (err) {
                  console.error('退出登录时出错:', err);
            } finally {
                  // 清除登录状态
                  this.clearLoginState();
            }
      }

      /**
       * 设置登录状态
       */
      public setLoginState(token: string, user: User): void {
            this._token.value = token;
            this._currentUser.value = user;

            // 计算 token 过期时间
            const expiryTime = Date.now() + STORAGE_EXPIRY.AUTH;

            // 持久化存储
            storage.saveUserToken(token);
            storage.set(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime, STORAGE_EXPIRY.AUTH);
            storage.saveUserInfo(user);

            // 通知状态变化
            this.notifyLogin(user.id);
            this.notifyStateChange(true);
      }

      /**
       * 清除登录状态
       */
      public clearLoginState(): void {
            this._token.value = null;
            this._currentUser.value = null;

            storage.remove(STORAGE_KEYS.TOKEN);
            storage.remove(STORAGE_KEYS.TOKEN_EXPIRY);
            storage.remove(STORAGE_KEYS.USER_INFO);

            // 通知状态变化
            this.notifyLogout();
            this.notifyStateChange(false);
      }

      /**
       * 添加登录事件监听器
       * @param callback 回调函数
       * @returns 取消监听的函数
       */
      public onLogin(callback: LoginCallback): () => void {
            this.loginCallbacks.add(callback);
            return () => this.loginCallbacks.delete(callback);
      }

      /**
       * 添加登出事件监听器
       * @param callback 回调函数
       * @returns 取消监听的函数
       */
      public onLogout(callback: LogoutCallback): () => void {
            this.logoutCallbacks.add(callback);
            return () => this.logoutCallbacks.delete(callback);
      }

      /**
       * 添加状态变化监听器
       * @param callback 回调函数
       * @returns 取消监听的函数
       */
      public onStateChange(callback: AuthStateChangeCallback): () => void {
            this.stateChangeCallbacks.add(callback);

            // 如果已初始化，则立即触发回调
            if (this._isInitialized.value) {
                  callback(this.isLoggedIn.value);
            }

            return () => this.stateChangeCallbacks.delete(callback);
      }

      /**
       * 通知登录事件
       */
      private notifyLogin(userId: string): void {
            this.loginCallbacks.forEach(callback => callback(userId));
      }

      /**
       * 通知登出事件
       */
      private notifyLogout(): void {
            this.logoutCallbacks.forEach(callback => callback());
      }

      /**
       * 通知状态变化
       */
      private notifyStateChange(isLoggedIn: boolean): void {
            this.stateChangeCallbacks.forEach(callback => callback(isLoggedIn));
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