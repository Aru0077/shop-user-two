<template>
    <div class="flex flex-col min-h-screen bg-gray-50 px-4 py-8">
        <div class="mb-6 text-center">
            <h1 class="text-2xl font-bold text-gray-900">Create Account</h1>
            <p class="text-gray-600 mt-2">Register to start shopping</p>
        </div>

        <div class="w-full max-w-md mx-auto bg-white rounded-lg shadow p-6">
            <form @submit.prevent="handleRegister" class="space-y-4">
                <!-- Username input -->
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User class="h-5 w-5 text-gray-400" />
                        </div>
                        <input id="username" v-model="username" type="text" required
                            class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Choose a username" />
                    </div>
                </div>

                <!-- Password input -->
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock class="h-5 w-5 text-gray-400" />
                        </div>
                        <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" required
                            class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Create a password" />
                        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <button type="button" @click="showPassword = !showPassword"
                                class="text-gray-400 hover:text-gray-500 focus:outline-none">
                                <Eye v-if="showPassword" class="h-5 w-5" />
                                <EyeOff v-else class="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Confirm Password input -->
                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Confirm
                        Password</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock class="h-5 w-5 text-gray-400" />
                        </div>
                        <input id="confirmPassword" v-model="confirmPassword"
                            :type="showConfirmPassword ? 'text' : 'password'" required
                            class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Confirm your password" />
                        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <button type="button" @click="showConfirmPassword = !showConfirmPassword"
                                class="text-gray-400 hover:text-gray-500 focus:outline-none">
                                <Eye v-if="showConfirmPassword" class="h-5 w-5" />
                                <EyeOff v-else class="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Error message -->
                <div v-if="error || localError" class="text-red-500 text-sm mt-2">
                    {{ localError || error }}
                </div>

                <!-- Register button -->
                <button type="submit"
                    class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    :disabled="loading">
                    <span v-if="!loading">Register</span>
                    <Loader v-else class="h-5 w-5 animate-spin" />
                </button>

                <!-- Login link -->
                <div class="text-center mt-4">
                    <p class="text-sm text-gray-600">
                        Already have an account?
                        <router-link to="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
                            Login here
                        </router-link>
                    </p>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { User, Lock, Eye, EyeOff, Loader } from 'lucide-vue-next';
import { useUserStore } from '@/stores/user.store';
import { useToast } from '@/composables/useToast';

const toast = useToast();
// Router
const router = useRouter();

// User store
const userStore = useUserStore();

// Form state
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const localError = ref('');
const loading = computed(() => userStore.loading);
const error = ref(''); // 替换为本地错误状态

// Handle register submission
const handleRegister = async () => {
    // Validate form
    localError.value = '';

    if (!username.value || !password.value || !confirmPassword.value) {
        localError.value = 'Please fill in all fields';
        return;
    }

    if (password.value !== confirmPassword.value) {
        localError.value = 'Passwords do not match';
        return;
    }

    if (password.value.length < 6) {
        localError.value = 'Password must be at least 6 characters long';
        return;
    }

    try {
        // 注册
        const newUser = await userStore.register({
            username: username.value,
            password: password.value
        });

        if (newUser) {
            // 注册成功后直接登录
            await userStore.login({
                username: username.value,
                password: password.value
            });

            toast.success('注册成功');
            router.replace('/home');
        }
    } catch (err: any) {
        console.error('注册失败:', err);
        localError.value = err.message || '注册失败';
        toast.error(localError.value);
    }
};
</script>