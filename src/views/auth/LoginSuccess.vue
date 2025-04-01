<template>
    <div class="flex flex-col items-center justify-center min-h-screen p-6">
        <div v-if="isProcessing" class="text-center">
            <div class="spinner mb-4"></div>
            <h2 class="text-xl font-semibold mb-2">登录成功，正在完成...</h2>
            <p class="text-gray-600">请稍候</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user.store';
import { toast } from '@/utils/toast.service';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import type { User } from '@/types/user.type';
import { cleanupHistory } from '@/utils/history';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const isProcessing = ref(true);

// 清理历史记录的函数
function clearBrowserHistory() {
    // 1. 使用replaceState清除当前历史记录
    window.history.replaceState(null, '', '/home');

    // 2. 强制添加新的历史记录并立即替换，彻底断开与之前历史的链接
    window.history.pushState(null, '', '/home');
    window.history.replaceState({ cleared: true }, '', '/home');

    // 3. 阻止返回到Facebook相关页面
    window.addEventListener('popstate', preventFacebookReturn);
}

// 阻止返回到Facebook页面的事件处理函数
function preventFacebookReturn(e: PopStateEvent) {
    const currentUrl = window.location.href;

    // 检测是否尝试返回到Facebook相关页面
    if (currentUrl.includes('facebook.com') ||
        currentUrl.includes('m.facebook.com') ||
        currentUrl.includes('privacy/consent/gdp')) {
        // 阻止导航并重定向到首页
        e.preventDefault();
        router.replace('/home');

        // 显示提示消息
        toast.info('已完成登录，无法返回到登录页面');
    }
}

onMounted(async () => {
    try {
        // 从URL查询参数中获取令牌和用户ID
        const token = route.query.token as string;
        const userId = route.query.userId as string;
        const username = decodeURIComponent(route.query.username as string);

        if (!token || !userId) {
            toast.error('登录信息不完整');
            router.replace('/home');
            return;
        }



        // 设置用户信息
        const user: User = {
            id: userId,
            username: username,
            isBlacklist: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 设置用户令牌
        userStore.token = token;
        userStore.user = user;

        // 保存到本地存储
        userStore.saveUserDataToStorage();

        // 发布登录成功事件
        eventBus.emit(EVENT_NAMES.USER_LOGIN, user);

        // 提示用户登录成功
        toast.success('Facebook登录成功');

        // 清理历史记录
        clearBrowserHistory();

        // 重定向到首页，使用replace而非push
        router.replace('/home');

    } catch (error) {
        console.error('处理登录失败:', error);
        toast.error('登录处理失败');
        router.replace('/home');
    } finally {
        isProcessing.value = false;
    }
});
</script>

<style scoped>
.spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-left-color: #1877F2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>