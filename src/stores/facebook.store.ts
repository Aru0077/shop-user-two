// src/stores/facebook.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { facebookUtils, type FacebookLoginOptions } from '@/utils/facebook.utils';
import { facebookApi } from '@/api/facebook.api';
import { useUserStore } from '@/stores/user.store';
import { toast } from '@/utils/toast.service';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import router from '@/router';

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
    
    // 登录状态追踪
    const loginState = ref<{
        pendingRedirect: boolean;
        authCode?: string;
        inProgress: boolean;
    }>({
        pendingRedirect: false,
        authCode: undefined,
        inProgress: false
    });

    // 计算属性
    const isConnected = computed(() => {
        return userStore.isLoggedIn && !!userStore.user?.facebookId;
    });

    /**
     * 初始化 Facebook SDK (仅用于必要功能)
     */
    async function init(): Promise<void> {
        // 如果已初始化则跳过
        if (initialized.value) return;

        try {
            loading.value = true;
            // 加载SDK但不进行任何访问令牌操作
            await facebookUtils.loadSDK();
            initialized.value = true;
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
    async function login(options: FacebookLoginOptions = { scope: 'public_profile,email' }): Promise<boolean> {
        if (loginState.value.inProgress) {
            toast.info('登录正在进行中，请稍候');
            return false;
        }
        
        try {
            loginState.value.inProgress = true;
            clearError();
            
            // 确保SDK已初始化
            if (!initialized.value) {
                await init();
            }

            // 移动设备使用重定向方式
            if (isMobileDevice()) {
                await loginWithRedirect(options.scope);
                return true; // 重定向后此返回值无意义
            } else {
                // 桌面设备使用弹窗方式
                return await loginWithPopupWindow(options.scope);
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Facebook 登录失败';
            error.value = errorMessage;
            toast.error(errorMessage);
            return false;
        } finally {
            loginState.value.inProgress = false;
        }
    }

    /**
     * 重定向方式登录（移动端首选）
     */
    async function loginWithRedirect(scope = 'public_profile,email'): Promise<void> {
        try {
            loading.value = true;
            
            // 设置状态为等待重定向
            loginState.value.pendingRedirect = true;
            
            // 获取回调URL
            const redirectUri = `${window.location.origin}/auth/facebook-callback`;
            
            // 生成登录URL
            const loginUrl = facebookUtils.generateLoginUrl(redirectUri, scope);
            
            // 将当前路径保存到sessionStorage以便登录后返回
            const currentPath = router.currentRoute.value.fullPath;
            sessionStorage.setItem('fb_redirect_path', currentPath);
            
            // 重定向到Facebook登录页面
            window.location.href = loginUrl;
        } catch (err: any) {
            loginState.value.pendingRedirect = false;
            const errorMessage = err.message || '获取Facebook登录链接失败';
            error.value = errorMessage;
            toast.error(errorMessage);
        }
    }

    /**
     * 弹窗窗口方式登录（桌面端首选）
     */
    async function loginWithPopupWindow(scope = 'public_profile,email'): Promise<boolean> {
        try {
            loading.value = true;
            
            // 使用弹窗方式登录
            const result = await facebookUtils.openLoginPopup(scope);
            
            if (!result.success) {
                if (result.error) {
                    error.value = result.error;
                    toast.error(result.error);
                }
                return false;
            }
            
            // 使用授权码登录
            if (result.code) {
                return await handleCallback(result.code);
            }
            
            return false;
        } catch (err: any) {
            const errorMessage = err.message || 'Facebook 弹窗登录失败';
            error.value = errorMessage;
            toast.error(errorMessage);
            return false;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 处理授权回调（由重定向或弹窗方式触发）
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

            // 重置登录状态
            loginState.value.pendingRedirect = false;
            loginState.value.authCode = undefined;

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
     * 使用访问令牌登录（仅在服务器端使用）
     */
    async function loginWithToken(accessToken: string): Promise<boolean> {
        if (!accessToken) {
            error.value = "访问令牌无效";
            return false;
        }

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
        loginState,

        // 方法
        init,
        login,
        loginWithRedirect,
        loginWithPopupWindow,
        handleCallback,
        loginWithToken,
        logout,
        clearError
    };
});