<template>
    <div class="flex flex-col min-h-screen px-8 mt-24">
        <!-- Page Title and Welcome Message -->
        <div class="w-full max-w-md mx-auto mb-8 text-center">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">Welcome to UniMall</h1>
            <p class="text-gray-600">Access your account to continue</p>
        </div>

        <!-- Main Content -->
        <div class="w-full max-w-md mx-auto space-y-6">

            <!-- Facebook登录按钮部分 -->
            <button @click="handleFacebookLogin" :disabled="fbLoading"
                class="w-full flex items-center justify-center py-3 px-4 bg-[#1877F2] text-white font-medium rounded-xl hover:shadow-md transition-all duration-200">
                <div v-if="fbLoading" class="animate-spin mr-2">
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                        </circle>
                        <path class="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                        </path>
                    </svg>
                </div>
                <svg v-else class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                    fill="currentColor">
                    <path
                        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continue with Facebook
            </button>


            <!-- Facebook Error Message -->
            <div v-if="facebookStore.error" class="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                {{ facebookStore.error }}
            </div>

            <!-- Divider -->
            <div class="relative">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-gray-200"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                    <span class="px-4 bg-gray-50 text-gray-500">Or continue with email</span>
                </div>
            </div>

            <!-- Login Form Section -->
            <form @submit.prevent="handleLogin" class="space-y-5">
                <!-- Email/Username Input -->
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700 mb-1">Email or Username</label>
                    <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User
                                class="h-5 w-5 text-gray-400 group-hover:text-gray-500 transition-colors duration-200" />
                        </div>
                        <input id="username" v-model="username" type="text" required
                            class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all duration-200"
                            placeholder="Enter your email or username" :disabled="isLoading" />
                    </div>
                </div>

                <!-- Password Input -->
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                        <!-- <router-link to="/forgot-password" class="text-sm text-blue-600 hover:text-blue-800">
                            Forgot password?
                        </router-link> -->
                    </div>
                    <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock
                                class="h-5 w-5 text-gray-400 group-hover:text-gray-500 transition-colors duration-200" />
                        </div>
                        <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" required
                            class="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all duration-200"
                            placeholder="Enter your password" :disabled="isLoading" />
                        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <button type="button" @click="showPassword = !showPassword"
                                class="text-gray-400 hover:text-gray-500 focus:outline-none" :disabled="isLoading">
                                <Eye v-if="showPassword" class="h-5 w-5" />
                                <EyeOff v-else class="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Error Message -->
                <div v-if="error" class="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                    {{ error }}
                </div>

                <!-- Login Button -->
                <button type="submit"
                    class="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                    :disabled="isLoading || !username || !password">
                    <span v-if="!isLoading">Sign In</span>
                    <span v-else class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg"
                            fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                            </circle>
                            <path class="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                            </path>
                        </svg>
                        Signing in...
                    </span>
                </button>
            </form>

            <!-- Registration Link -->
            <div class="text-center">
                <p class="text-sm text-gray-600">
                    Don't have an account?
                    <router-link to="/register" class="font-medium text-blue-600 hover:text-blue-800">
                        Create one now
                    </router-link>
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { User, Lock, Eye, EyeOff } from 'lucide-vue-next';
import { useUserStore } from '@/stores/user.store';
import { useFacebookStore } from '@/stores/facebook.store';
import { useToast } from '@/composables/useToast';
import { facebookUtils } from '@/utils/facebook.utils';
import { cleanupAuthRedirect } from '@/utils/history';

// Initialize router, state management and toast
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const facebookStore = useFacebookStore();
const toast = useToast();

// Component state
const username = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = computed(() => userStore.loginLoading);
const fbLoading = ref(false);
const error = ref('');

// 初始化Facebook SDK 
onMounted(async () => {
    try {
        await facebookUtils.initSDK();

        // 只检查Hash片段方式的回调(token方式)
        if (window.location.hash.includes('access_token=')) {
            fbLoading.value = true;
            try {
                const params = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = params.get('access_token');
                const state = params.get('state');

                // 验证state防止CSRF攻击
                const savedState = localStorage.getItem('fb_auth_state');
                localStorage.removeItem('fb_auth_state');

                if (state && savedState && state === savedState && accessToken) {
                    await handleFacebookToken(accessToken);

                    // 清理URL中的token参数
                    cleanupAuthRedirect();
                }
            } catch (err) {
                console.error('Facebook回调处理失败:', err);
                error.value = '登录失败，请重试';
            } finally {
                fbLoading.value = false;
            }
        }
    } catch (err) {
        console.error('Facebook SDK加载失败:', err);
    }
});

// 提取处理令牌的逻辑为单独函数
async function handleFacebookToken(accessToken: string) {
    if (!accessToken) {
        error.value = '获取访问令牌失败';
        return;
    }
    // 这里不再调用 getUserInfo，因为我们已经有了访问令牌
    const success = await facebookStore.loginWithToken(accessToken);

    if (success) {
        toast.success('Facebook登录成功');
        const redirectPath = route.query.redirect || '/home';
        router.replace(redirectPath as string);
    }
}



// 处理Facebook登录 
const handleFacebookLogin = async () => {
    try {
        fbLoading.value = true;
        error.value = '';

        // 1. 执行Facebook登录
        const loginResponse = await facebookUtils.login('public_profile');

        // 2. 获取访问令牌
        const accessToken = loginResponse.authResponse?.accessToken;
        if (!accessToken) {
            throw new Error('获取访问令牌失败');
        }

        // 3. 获取用户信息 - 不再传递 accessToken 参数
        await facebookUtils.getUserInfo();

        // 4. 将令牌发送给后端并获取登录结果
        const success = await facebookStore.loginWithToken(accessToken);

        if (success) {
            toast.success('Facebook登录成功');

            // 重定向到来源页或首页
            const redirectPath = route.query.redirect as string || '/home';
            router.replace(redirectPath);
        }
    } catch (err: any) {
        console.error('Facebook登录失败:', err);
        error.value = err.message || 'Facebook登录失败，请重试';
        toast.error(error.value);
    } finally {
        fbLoading.value = false;
    }
};


// Handle traditional login
const handleLogin = async () => {
    if (!username.value || !password.value) {
        error.value = 'Please enter both username and password';
        return;
    }

    error.value = ''; // Clear previous errors

    try {
        const response = await userStore.login({
            username: username.value,
            password: password.value
        });

        if (response) {
            toast.success('Login successful');

            // Redirect to source page or homepage
            const redirectPath = route.query.redirect as string || '/home';
            router.replace(redirectPath);
        }
    } catch (err: any) {
        console.error('Login failed:', err);
        error.value = err.message || 'Login failed. Please check your credentials.';
        toast.error(error.value);
    }
};
onUnmounted(() => {
    // 清理错误状态
    facebookStore.clearError();
    error.value = '';
});


</script>