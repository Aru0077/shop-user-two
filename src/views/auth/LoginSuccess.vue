<template>
    <div class="flex flex-col items-center justify-center min-h-screen p-6">
        <div v-if="isProcessing" class="text-center">
            <div class="spinner mb-4"></div>
            <h2 class="text-xl font-semibold mb-2">登录成功，正在处理...</h2>
            <p class="text-gray-600">请稍候，正在完成登录</p>
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

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const isProcessing = ref(true);

onMounted(async () => {
    try {
        // 从URL查询参数中获取令牌和用户ID
        const token = route.query.token as string;
        const userId = route.query.userId as string;

        if (!token || !userId) {
            toast.error('登录信息不完整');
            router.replace('/login');
            return;
        }

        // 设置用户令牌
        userStore.token = token;

        // 创建基本用户信息（实际应用中可能需要通过API获取完整用户信息）
        const user: User = {
            id: userId,
            username: '用户' + userId.substring(0, 6), // 临时用户名
            isBlacklist: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // facebookId是可选的，所以不需要设置
        };

        userStore.user = user;

        // 保存到本地存储
        userStore.saveUserDataToStorage();

        // 发布登录成功事件
        eventBus.emit(EVENT_NAMES.USER_LOGIN, user);

        // 提示用户登录成功
        toast.success('Facebook登录成功');

        // 重定向到主页或者来源页面
        const redirectPath = sessionStorage.getItem('fb_redirect_path') || '/home';
        sessionStorage.removeItem('fb_redirect_path');

        // 完成重定向
        router.replace(redirectPath);
    } catch (error) {
        console.error('处理登录成功回调失败:', error);
        toast.error('登录处理失败');
        router.replace('/login');
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