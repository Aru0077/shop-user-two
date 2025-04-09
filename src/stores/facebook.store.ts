// src/stores/facebook.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { facebookApi } from '@/api/facebook.api';
import { useUserStore } from '@/stores/user.store';
import { toast } from '@/utils/toast.service';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';

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
     * 使用访问令牌登录
     */
    async function loginWithToken(accessToken: string): Promise<boolean> {
        try {
            loading.value = true;
            clearError();

            const response = await facebookApi.loginWithToken(accessToken);

            // 设置用户信息
            userStore.token = response.token;
            userStore.user = response.user;

            // 保存token过期时间（重要！）
            if (response.expiresAt) {
                userStore.tokenExpiresAt = response.expiresAt;
            }

            // 保存到本地存储
            userStore.saveUserDataToStorage();

            // 发布登录成功事件
            eventBus.emit(EVENT_NAMES.USER_LOGIN, response.user);

            return true;
        } catch (err: any) {
            const errorMessage = err.message || 'Facebook登录失败';
            error.value = errorMessage;
            toast.error(errorMessage);
            return false;
        } finally {
            loading.value = false;
        }
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
        loginWithToken,
        clearError
    };
});