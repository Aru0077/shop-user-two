<template>
    <div class="flex flex-col min-h-screen bg-gray-50 px-4 py-8">
        <div class="mb-6 text-center">
            <h1 class="text-2xl font-bold text-gray-900">Login</h1>
            <p class="text-gray-600 mt-2">Welcome back! Please enter your credentials</p>
        </div>

        <div class="w-full max-w-md mx-auto bg-white rounded-lg shadow p-6">
            <form @submit.prevent="handleLogin" class="space-y-4">
                <!-- Username input -->
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User class="h-5 w-5 text-gray-400" />
                        </div>
                        <input id="username" v-model="username" type="text" required
                            class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter your username" />
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
                            placeholder="Enter your password" />
                        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <button type="button" @click="showPassword = !showPassword"
                                class="text-gray-400 hover:text-gray-500 focus:outline-none">
                                <Eye v-if="showPassword" class="h-5 w-5" />
                                <EyeOff v-else class="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Error message -->
                <div v-if="error" class="text-red-500 text-sm mt-2">
                    {{ error }}
                </div>

                <!-- Login button -->
                <button type="submit"
                    class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    :disabled="loading">
                    <span v-if="!loading">Login</span>
                    <Loader v-else class="h-5 w-5 animate-spin" />
                </button>

                <!-- Register link -->
                <div class="text-center mt-4">
                    <p class="text-sm text-gray-600">
                        Don't have an account?
                        <router-link to="/register" class="font-medium text-indigo-600 hover:text-indigo-500">
                            Register now
                        </router-link>
                    </p>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { User, Lock, Eye, EyeOff, Loader } from 'lucide-vue-next';
import { useUserStore } from '@/stores/user.store';

// Router
const router = useRouter();
const route = useRoute();

// User store
const userStore = useUserStore();

// Form state
const username = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = computed(() => userStore.loading);
const error = computed(() => userStore.error);

// Handle login submission
const handleLogin = async () => {
    if (!username.value || !password.value) {
        return;
    }

    try {
        await userStore.login({
            username: username.value,
            password: password.value
        });

        // Redirect to the redirect URL or to home page
        const redirectPath = route.query.redirect as string || '/home';
        router.replace(redirectPath);
    } catch (err) {
        console.error('Login failed:', err);
    }
};
</script>