<template>
    <div class="flex flex-col min-h-screen px-8 mt-24">
        <!-- Page Title and Welcome Message -->
        <div class="w-full max-w-md mx-auto mb-8 text-center">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">Create Account</h1>
            <p class="text-gray-600">Register to start your shopping experience</p>
        </div>

        <!-- Main Content -->
        <div class="w-full max-w-md mx-auto space-y-6">
            <!-- Registration Form Section -->
            <form @submit.prevent="handleRegister" class="space-y-5">
                <!-- Username Input -->
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User
                                class="h-5 w-5 text-gray-400 group-hover:text-gray-500 transition-colors duration-200" />
                        </div>
                        <input id="username" v-model="username" type="text" required
                            class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all duration-200"
                            placeholder="Choose a username" :disabled="isLoading" />
                    </div>
                </div>

                <!-- Password Input -->
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock
                                class="h-5 w-5 text-gray-400 group-hover:text-gray-500 transition-colors duration-200" />
                        </div>
                        <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" required
                            class="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all duration-200"
                            placeholder="Create a password" :disabled="isLoading" />
                        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <button type="button" @click="showPassword = !showPassword"
                                class="text-gray-400 hover:text-gray-500 focus:outline-none" :disabled="isLoading">
                                <Eye v-if="showPassword" class="h-5 w-5" />
                                <EyeOff v-else class="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    <p class="mt-1 text-xs text-gray-500">The password must contain at least 6 characters</p>
                </div>

                <!-- Confirm Password Input -->
                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Confirm
                        Password</label>
                    <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <ShieldCheck
                                class="h-5 w-5 text-gray-400 group-hover:text-gray-500 transition-colors duration-200" />
                        </div>
                        <input id="confirmPassword" v-model="confirmPassword"
                            :type="showConfirmPassword ? 'text' : 'password'" required
                            class="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all duration-200"
                            placeholder="Confirm your password" :disabled="isLoading" />
                        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <button type="button" @click="showConfirmPassword = !showConfirmPassword"
                                class="text-gray-400 hover:text-gray-500 focus:outline-none" :disabled="isLoading">
                                <Eye v-if="showConfirmPassword" class="h-5 w-5" />
                                <EyeOff v-else class="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Error Message -->
                <div v-if="error" class="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                    {{ error }}
                </div>

                <!-- Register Button -->
                <button type="submit"
                    class="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                    :disabled="isLoading || !username || !password || !confirmPassword">
                    <span v-if="!isLoading">Register</span>
                    <span v-else class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg"
                            fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                            </circle>
                            <path class="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                            </path>
                        </svg>
                        Registering...
                    </span>
                </button>
            </form>

            <!-- Login Link -->
            <div class="text-center">
                <p class="text-sm text-gray-600">
                    Already have an account?
                    <router-link to="/login" class="font-medium text-blue-600 hover:text-blue-800">
                        Sign in now
                    </router-link>
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { User, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/composables/useToast';
import { cleanupHistory } from '@/utils/history';
import { authService } from '@/services/auth.service';

// 初始化路由、状态管理和 toast
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

// 设置路由到服务中
authService.setRouter(router);

// 组件状态
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const isLoading = computed(() => authStore.loading);
const error = ref('');

// 处理注册 
const handleRegister = async () => {
    // 表单验证
    error.value = '';

    if (!username.value || !password.value || !confirmPassword.value) {
        error.value = 'Please fill in all required fields';
        return;
    }

    if (password.value !== confirmPassword.value) {
        error.value = 'The passwords entered do not match';
        return;
    }

    if (password.value.length < 6) {
        error.value = 'Password must be at least 6 characters long';
        return;
    }

    try {
        // 注册用户
        const newUser = await authStore.register({
            username: username.value,
            password: password.value
        });

        if (newUser) {
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
            }
        }
    } catch (err: any) {
        console.error('Registration failed:', err);
        error.value = err.message || 'Registration failed, please try again later';
        toast.error(error.value);
    }
};
</script>