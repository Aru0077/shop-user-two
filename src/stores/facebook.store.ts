// facebook.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { facebookApi } from '@/api/facebook.api';
import { useUserStore } from '@/stores/user.store';
import { toast } from '@/utils/toast.service';

export const useFacebookStore = defineStore('facebook', () => {
    // 状态
    const initialized = ref(true); // 简化，直接设为true
    const loading = ref(false);
    const error = ref<string | null>(null);
    const userStore = useUserStore();

    // 计算属性
    const isConnected = computed(() => {
        return userStore.isLoggedIn && !!userStore.user?.facebookId;
    });

    /**
     * 获取Facebook登录URL
     */
    async function getLoginUrl(): Promise<{ loginUrl: string }> {
        try {
            loading.value = true;
            clearError();
            return await facebookApi.getLoginUrl();
        } catch (err: any) {
            const errorMessage = err.message || '获取Facebook登录链接失败';
            error.value = errorMessage;
            toast.error(errorMessage);
            throw err;
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
        getLoginUrl,
        clearError
    };
});