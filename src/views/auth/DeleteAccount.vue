<template>
    <div class="pageContent pb-20">
        <!-- 页面标题 -->
        <PageTitle mainTitle="删除账号" />

        <!-- 间距占位符 -->
        <div class="w-full h-6"></div>

        <!-- 警告图标 -->
        <div class="flex justify-center mb-6">
            <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle class="w-10 h-10 text-red-500" />
            </div>
        </div>

        <!-- 警告信息 -->
        <div class="bg-red-50 p-5 rounded-xl mb-6">
            <h2 class="text-lg font-bold text-red-600 mb-3">警告</h2>
            <p class="text-sm text-gray-700 mb-2">
                此操作将永久删除您的账号和所有相关数据。
            </p>
            <p class="text-sm text-gray-700 mb-2">
                一旦删除，您将无法恢复任何信息。
            </p>
            <p class="text-sm text-gray-700 font-medium">
                请输入您的密码确认删除账号。
            </p>
        </div>

        <!-- 密码输入表单 -->
        <form @submit.prevent="confirmDelete" class="mb-8">
            <div class="mb-4">
                <label for="password" class="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock class="h-5 w-5 text-gray-400" />
                    </div>
                    <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" required
                        class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="请输入您的密码" />
                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button type="button" @click="showPassword = !showPassword"
                            class="text-gray-400 hover:text-gray-500 focus:outline-none">
                            <Eye v-if="showPassword" class="h-5 w-5" />
                            <EyeOff v-else class="h-5 w-5" />
                        </button>
                    </div>
                </div>
                <div v-if="error" class="text-red-500 text-sm mt-2">
                    {{ error }}
                </div>
            </div>

            <!-- 删除按钮 -->
            <button type="submit"
                class="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center justify-center transition-colors duration-200"
                :disabled="isLoading || !password">
                <span v-if="!isLoading">删除我的账号</span>
                <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </button>
        </form>

        <!-- 取消按钮 -->
        <button @click="goBack" class="w-full py-3 bg-gray-100 text-gray-800 font-medium rounded-lg"
            :disabled="isLoading">
            取消
        </button>

        <!-- 确认对话框 -->
        <div v-if="showConfirmDialog"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white p-6 rounded-xl max-w-xs w-full">
                <h3 class="text-lg font-bold mb-3">确认删除？</h3>
                <p class="text-gray-600 mb-6">
                    此操作无法撤销，您的所有数据将被永久删除。
                </p>
                <div class="flex space-x-3">
                    <button @click="showConfirmDialog = false" class="flex-1 py-2 bg-gray-100 rounded-lg">
                        取消
                    </button>
                    <button @click="deleteAccount" class="flex-1 py-2 bg-red-600 text-white rounded-lg">
                        删除
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { AlertTriangle, Lock, Eye, EyeOff } from 'lucide-vue-next';
import { useUserStore } from '@/stores/user.store';
import { useToast } from '@/composables/useToast';
import PageTitle from '@/components/common/PageTitle.vue';

// 初始化路由、状态管理和 toast
const router = useRouter();
const userStore = useUserStore();
const toast = useToast();

// 组件状态
const password = ref('');
const showPassword = ref(false);
const isLoading = computed(() => userStore.loading);
const error = ref('');
const showConfirmDialog = ref(false);

// 确认删除 - 显示二次确认对话框
const confirmDelete = () => {
    if (!password.value) return;
    error.value = ''; // 清除之前的错误信息
    showConfirmDialog.value = true;
};

// 执行删除账号操作
const deleteAccount = async () => {
    try {
        const success = await userStore.deleteAccount({
            password: password.value
        });

        if (success) {
            toast.success('您的账号已成功删除');
            showConfirmDialog.value = false;
            router.replace('/home');
        }
    } catch (err: any) {
        error.value = err.message || '删除账号失败';
        toast.error(error.value);
        showConfirmDialog.value = false;
    }
};

// 返回上一页
const goBack = () => {
    router.back();
};
</script>