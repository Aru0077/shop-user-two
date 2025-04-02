<template>
    <div class="flex flex-col min-h-screen bg-gray-50">
        <!-- 注册卡片 -->
        <div class="flex-1 flex items-center justify-center p-6">
            <div class="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                <!-- 标题区 -->
                <div class="bg-gradient-to-r from-green-500 to-teal-600 p-8 text-white">
                    <h1 class="text-3xl font-bold">创建账号</h1>
                    <p class="mt-2 text-green-100">注册以开始您的购物体验</p>
                </div>

                <!-- 表单区 -->
                <div class="p-8">
                    <form @submit.prevent="handleRegister" class="space-y-6">
                        <!-- 用户名输入 -->
                        <div>
                            <label for="username" class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User class="h-5 w-5 text-gray-400" />
                                </div>
                                <input id="username" v-model="username" type="text" required
                                    class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                                    placeholder="选择一个用户名" :disabled="isLoading" />
                            </div>
                        </div>

                        <!-- 密码输入 -->
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">密码</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock class="h-5 w-5 text-gray-400" />
                                </div>
                                <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'"
                                    required
                                    class="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                                    placeholder="创建一个密码" :disabled="isLoading" />
                                <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <button type="button" @click="showPassword = !showPassword"
                                        class="text-gray-400 hover:text-gray-500 focus:outline-none"
                                        :disabled="isLoading">
                                        <Eye v-if="showPassword" class="h-5 w-5" />
                                        <EyeOff v-else class="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <p class="mt-1 text-xs text-gray-500">密码必须至少包含6个字符</p>
                        </div>

                        <!-- 确认密码输入 -->
                        <div>
                            <label for="confirmPassword"
                                class="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <ShieldCheck class="h-5 w-5 text-gray-400" />
                                </div>
                                <input id="confirmPassword" v-model="confirmPassword"
                                    :type="showConfirmPassword ? 'text' : 'password'" required
                                    class="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                                    placeholder="确认您的密码" :disabled="isLoading" />
                                <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <button type="button" @click="showConfirmPassword = !showConfirmPassword"
                                        class="text-gray-400 hover:text-gray-500 focus:outline-none"
                                        :disabled="isLoading">
                                        <Eye v-if="showConfirmPassword" class="h-5 w-5" />
                                        <EyeOff v-else class="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 错误消息 -->
                        <div v-if="error" class="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                            {{ error }}
                        </div>

                        <!-- 注册按钮 -->
                        <button type="submit"
                            class="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-teal-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                            :disabled="isLoading || !username || !password || !confirmPassword">
                            <span v-if="!isLoading">注册</span>
                            <span v-else class="flex items-center">
                                <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                        stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                    </path>
                                </svg>
                                注册中...
                            </span>
                        </button>

                        <!-- 登录链接 -->
                        <div class="text-center mt-6">
                            <p class="text-sm text-gray-600">
                                已有账号?
                                <router-link to="/login" class="font-medium text-green-600 hover:text-green-800">
                                    立即登录
                                </router-link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { User, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-vue-next';
import { useUserStore } from '@/stores/user.store';
import { useToast } from '@/composables/useToast';
import { cleanupHistory } from '@/utils/history';

// 初始化路由、状态管理和 toast
const router = useRouter();
const userStore = useUserStore();
const toast = useToast();

// 组件状态
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const isLoading = computed(() => userStore.registerLoading);
const error = ref('');

// 处理注册
const handleRegister = async () => {
    // 表单验证
    error.value = '';

    if (!username.value || !password.value || !confirmPassword.value) {
        error.value = '请填写所有必填字段';
        return;
    }

    if (password.value !== confirmPassword.value) {
        error.value = '两次输入的密码不一致';
        return;
    }

    if (password.value.length < 6) {
        error.value = '密码长度必须至少为6个字符';
        return;
    }

    try {
        // 注册用户
        const newUser = await userStore.register({
            username: username.value,
            password: password.value
        });

        if (newUser) {
            // 注册成功后自动登录
            await userStore.login({
                username: username.value,
                password: password.value
            });

            toast.success('注册成功');
            // 添加历史清理
            const clearHistory = cleanupHistory([
                'facebook.com',
                'm.facebook.com',
                '/login',
                '/register'
            ]);
            // 立即执行历史清理
            if (clearHistory) {
                clearHistory();
            } else {
                console.warn('clearHistory is undefined');
            }

            router.replace('/home');
        }
    } catch (err: any) {
        console.error('注册失败:', err);
        error.value = err.message || '注册失败，请稍后再试';
        toast.error(error.value);
    }
};
</script>