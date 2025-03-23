// src/stores/facebook.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { facebookUtils } from '@/utils/facebook.utils';
import { facebookApi } from '@/api/facebook.api';
import { useUserStore } from '@/stores/user.store';
import { toast } from '@/utils/toast.service';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import type { FacebookLoginOptions } from '@/types/facebook.type';

/**
 * Facebook登录Store
 */
export const useFacebookStore = defineStore('facebook', () => {
      // 状态
      const initialized = ref(false);
      const loading = ref(false);
      const error = ref<string | null>(null);
      const userStore = useUserStore();

      // 计算属性
      const isConnected = computed(() => {
            return userStore.isLoggedIn && !!userStore.user?.facebookId;
      });

      /**
       * 初始化Facebook SDK
       */
      async function init(): Promise<void> {
            if (initialized.value) return;

            try {
                  loading.value = true;
                  await facebookUtils.loadSDK();
                  initialized.value = true;

                  // 检查登录状态
                  const response = await facebookUtils.getLoginStatus();
                  if (response.status === 'connected' && response.authResponse?.accessToken) {
                        // 如果已连接但未登录系统，则自动登录
                        if (!userStore.isLoggedIn) {
                              await loginWithToken(response.authResponse.accessToken);
                        }
                  }
            } catch (err: any) {
                  error.value = err.message || '初始化Facebook SDK失败';
                  console.error('初始化Facebook SDK失败:', err);
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 使用弹窗方式登录
       */
      async function loginWithPopup(options: FacebookLoginOptions = { scope: 'public_profile' }): Promise<boolean> {
            if (!initialized.value) {
                  await init();
            }

            try {
                  loading.value = true;
                  const response = await facebookUtils.login(options);

                  if (response.status !== 'connected' || !response.authResponse) {
                        return false;
                  }

                  return await loginWithToken(response.authResponse.accessToken);
            } catch (err: any) {
                  error.value = err.message || 'Facebook登录失败';
                  toast.error(error.value|| 'Facebook登录失败');
                  return false;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 重定向方式登录
       */
      async function loginWithRedirect(): Promise<void> {
            try {
                  loading.value = true;
                  const response = await facebookApi.getLoginUrl();
                  window.location.href = response.loginUrl;
            } catch (err: any) {
                  error.value = err.message || '获取Facebook登录链接失败';
                  toast.error(error.value || '获取Facebook登录链接失败');
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 处理授权回调
       */
      async function handleCallback(code: string): Promise<boolean> {
            try {
                  loading.value = true;
                  const response = await facebookApi.handleCallback(code);

                  // 更新用户状态
                  userStore.token = response.token;
                  userStore.user = response.user;
                  userStore.saveUserDataToStorage();

                  // 发布登录成功事件
                  eventBus.emit(EVENT_NAMES.USER_LOGIN, response.user);

                  toast.success('Facebook登录成功');
                  return true;
            } catch (err: any) {
                  error.value = err.message || 'Facebook登录失败';
                  toast.error(error.value || 'Facebook登录失败');
                  return false;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 使用访问令牌登录
       */
      async function loginWithToken(accessToken: string): Promise<boolean> {
            try {
                  loading.value = true;
                  const response = await facebookApi.loginWithToken(accessToken);

                  // 更新用户状态
                  userStore.token = response.token;
                  userStore.user = response.user;
                  userStore.saveUserDataToStorage();

                  // 发布登录成功事件
                  eventBus.emit(EVENT_NAMES.USER_LOGIN, response.user);

                  toast.success('Facebook登录成功');
                  return true;
            } catch (err: any) {
                  error.value = err.message || 'Facebook令牌登录失败';
                  toast.error(error.value || 'Facebook令牌登录失败');
                  return false;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 退出登录
       */
      async function logout(): Promise<void> {
            if (initialized.value) {
                  await facebookUtils.logout();
            }
            await userStore.logout();
      }

      return {
            // 状态
            initialized,
            loading,
            error,
            isConnected,

            // 方法
            init,
            loginWithPopup,
            loginWithRedirect,
            handleCallback,
            loginWithToken,
            logout
      };
});