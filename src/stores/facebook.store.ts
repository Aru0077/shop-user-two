// src/stores/facebook.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { facebookUtils, type FacebookLoginOptions } from '@/utils/facebook.utils';
import { facebookApi } from '@/api/facebook.api';
import { useUserStore } from '@/stores/user.store';
import { toast } from '@/utils/toast.service';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';

/**
 * 检测是否为移动设备
 */
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Facebook 登录 Store
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
   * 初始化 Facebook SDK
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
      const errorMessage = err.message || '初始化 Facebook SDK 失败';
      error.value = errorMessage;
      console.error('初始化 Facebook SDK 失败:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * 智能登录 - 根据设备类型选择最佳登录方式
   */
  async function login(options: FacebookLoginOptions = { scope: 'public_profile' }): Promise<boolean> {
    if (!initialized.value) {
      await init();
    }

    // 移动设备优先使用重定向方式
    if (isMobileDevice()) {
      await loginWithRedirect();
      return true; // 注意：重定向后此处返回值无意义
    } else {
      // 桌面设备使用弹窗方式
      return await loginWithPopup(options);
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
      let errorMessage = err.message || 'Facebook 登录失败';

      // 处理特定类型的错误
      if (err.message?.includes('popup')) {
        errorMessage = '弹窗被阻止，请尝试使用重定向方式登录';
        
        // 弹窗被阻止时，可以尝试切换到重定向方式
        await loginWithRedirect();
        return true;
      }

      error.value = errorMessage;
      toast.error(errorMessage);
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
      const errorMessage = err.message || '获取 Facebook 登录链接失败';
      error.value = errorMessage;
      toast.error(errorMessage);
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

      toast.success('Facebook 登录成功');
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Facebook 登录失败';
      error.value = errorMessage;
      toast.error(errorMessage);
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

      toast.success('Facebook 登录成功');
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Facebook 令牌登录失败';
      error.value = errorMessage;
      toast.error(errorMessage);
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
      try {
        await facebookUtils.logout();
      } catch (err) {
        console.error('Facebook 退出登录失败:', err);
      }
    }
    await userStore.logout();
  }

  /**
   * 清除错误
   */
  function clearError(): void {
    error.value = null;
  }

  return {
    // 状态
    initialized,
    loading,
    error,
    isConnected,

    // 方法
    init,
    login,  // 新增智能登录方法
    loginWithPopup,
    loginWithRedirect,
    handleCallback,
    loginWithToken,
    logout,
    clearError
  };
});