<template>
    <div class="flex flex-col min-h-screen bg-gray-50">
        <!-- Login Card -->
        <div class="flex-1 flex items-center justify-center p-6">
            <div class="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
                <!-- Header Section -->
                <div class="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
                    <h1 class="text-3xl font-bold">Welcome Back</h1>
                    <p class="mt-2 text-blue-100">Sign in to your account to continue</p>
                </div>

                <!-- Form Section -->
                <div class="p-8">
                    <!-- Social Login Options -->
                    <div class="mb-6">
                        <button @click="handleFacebookLogin" :disabled="fbLoading || !isFbInitialized"
                            class="w-full flex items-center justify-center py-3 px-4 bg-[#1877F2] text-white font-medium rounded-lg hover:bg-[#166FE5] transition-colors duration-200">
                            <div v-if="fbLoading" class="animate-spin mr-2">
                                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                        stroke-width="4"></circle>
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
                            <span v-if="!isFbInitialized">Loading Facebook...</span>
                            <span v-else>Continue with Facebook</span>
                        </button>
                    </div>

                    <!-- Divider -->
                    <div class="relative my-6">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-300"></div>
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-2 bg-white text-gray-500">Or continue with email</span>
                        </div>
                    </div>

                    <!-- Email & Password Form -->
                    <form @submit.prevent="handleLogin" class="space-y-5">
                        <!-- Email/Username Input -->
                        <div>
                            <label for="username" class="block text-sm font-medium text-gray-700 mb-1">Email or
                                Username</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User class="h-5 w-5 text-gray-400" />
                                </div>
                                <input id="username" v-model="username" type="text" required
                                    class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    placeholder="Enter your email or username" :disabled="isLoading" />
                            </div>
                        </div>

                        <!-- Password Input -->
                        <div>
                            <div class="flex items-center justify-between mb-1">
                                <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                                <router-link to="/forgot-password" class="text-sm text-blue-600 hover:text-blue-800">
                                    Forgot password?
                                </router-link>
                            </div>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock class="h-5 w-5 text-gray-400" />
                                </div>
                                <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'"
                                    required
                                    class="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    placeholder="Enter your password" :disabled="isLoading" />
                                <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <button type="button" @click="showPassword = !showPassword"
                                        class="text-gray-400 hover:text-gray-500 focus:outline-none"
                                        :disabled="isLoading">
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
                            class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                            :disabled="isLoading || !username || !password">
                            <span v-if="!isLoading">Sign In</span>
                            <span v-else class="flex items-center">
                                <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                        stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                    </path>
                                </svg>
                                Signing in...
                            </span>
                        </button>
                    </form>

                    <!-- Registration Link -->
                    <div class="text-center mt-6">
                        <p class="text-sm text-gray-600">
                            Don't have an account?
                            <router-link to="/register" class="font-medium text-blue-600 hover:text-blue-800">
                                Create one now
                            </router-link>
                        </p>
                    </div>

                    <!-- Facebook Error Message -->
                    <div v-if="fbError" class="mt-4 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                        {{ fbError }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { User, Lock, Eye, EyeOff } from 'lucide-vue-next';
import { useUserStore } from '@/stores/user.store';
import { useToast } from '@/composables/useToast';

// Initialize router, state management and toast
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const toast = useToast();

// Component state
const username = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = computed(() => userStore.loginLoading);
const error = ref('');

// Facebook specific state
const isFbInitialized = ref(false);
const fbLoading = ref(false);
const fbError = ref('');

// Initialize Facebook SDK
onMounted(() => {
    initializeFacebookSDK();
});

const initializeFacebookSDK = () => {
    // Check if we're on HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        fbError.value = 'Facebook Login requires HTTPS. Please use a secure connection.';
        return;
    }

    // Load Facebook SDK
    (function (d, s, id) {
        const fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        const js = d.createElement(s) as HTMLScriptElement;
        js.id = id;
        js.src = 'https://connect.facebook.net/en_US/sdk.js';
        js.onload = () => {
            // Initialize FB SDK after it's loaded
            if (window.FB) {
                window.FB.init({
                    appId: import.meta.env.VITE_FACEBOOK_APP_ID,
                    cookie: true,
                    xfbml: true,
                    version: 'v22.0'
                });
                isFbInitialized.value = true;
            }
        };
        if (fjs && fjs.parentNode) {
            fjs.parentNode.insertBefore(js, fjs);
        }
    }(document, 'script', 'facebook-jssdk'));
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

// Handle Facebook login
const handleFacebookLogin = async () => {
    if (!isFbInitialized.value) {
        fbError.value = 'Facebook SDK is not initialized yet. Please try again.';
        return;
    }

    fbError.value = ''; // Clear previous errors
    fbLoading.value = true;

    try {
        // Direct SDK usage instead of using facebookStore
        window.FB.login(
            async function (response) {
                if (response.status === 'connected' && response.authResponse) {
                    try {
                        // Get access token
                        const accessToken = response.authResponse.accessToken;

                        // Call your server to validate and login
                        // Here we would normally use facebookStore.loginWithToken but
                        // since we're avoiding intermediate abstractions, we'll call API directly
                        const result = await loginWithFacebookToken(accessToken);

                        if (result) {
                            toast.success('Facebook login successful');

                            // Redirect to source page or homepage
                            const redirectPath = route.query.redirect as string || '/home';
                            router.replace(redirectPath);
                        }
                    } catch (error: any) {
                        console.error('Error processing Facebook login:', error);
                        fbError.value = error.message || 'Failed to process Facebook login';
                        toast.error(fbError.value);
                    }
                } else {
                    fbError.value = 'Facebook login was cancelled or failed';
                }
                fbLoading.value = false;
            },
            { scope: 'public_profile' }
        );
    } catch (err: any) {
        console.error('Facebook login error:', err);
        fbError.value = err.message || 'Facebook login failed. Please try again.';
        toast.error(fbError.value);
        fbLoading.value = false;
    }
};

// Login with Facebook token function (direct API call)
const loginWithFacebookToken = async (accessToken: string) => {
    try {
        // We're using fetch directly instead of the facebookApi abstraction
        const response = await fetch('/shop/facebook/token-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ accessToken }),
        });

        if (!response.ok) {
            throw new Error('Server error during Facebook login');
        }

        const data = await response.json();

        // Update user store directly
        userStore.token = data.token;
        userStore.user = data.user;
        userStore.saveUserDataToStorage();

        return true;
    } catch (err) {
        console.error('Token login failed:', err);
        throw err;
    }
};

// Add FB typing
declare global {
    interface Window {
        FB: {
            init: (options: any) => void;
            login: (callback: (response: any) => void, options?: any) => void;
        }; 
    }
}
</script>