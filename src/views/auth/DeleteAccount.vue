<template>
    <div class="pageContent pb-20">
        <!-- Page title -->
        <PageTitle mainTitle="Delete Account" />

        <!-- Spacing placeholder -->
        <div class="w-full h-6"></div>

        <!-- Warning icon -->
        <div class="flex justify-center mb-6">
            <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle class="w-10 h-10 text-red-500" />
            </div>
        </div>

        <!-- Warning message -->
        <div class="bg-red-50 p-5 rounded-xl mb-6">
            <h2 class="text-lg font-bold text-red-600 mb-3">Warning</h2>
            <p class="text-sm text-gray-700 mb-2">
                This action will permanently delete your account and all associated data.
            </p>
            <p class="text-sm text-gray-700 mb-2">
                Once deleted, you will not be able to recover any information.
            </p>
        </div>

        <!-- Delete button -->
        <button @click="confirmDelete" 
            class="w-full py-3 mb-8 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center justify-center transition-colors duration-200"
            :disabled="isLoading">
            <span v-if="!isLoading">Delete My Account</span>
            <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </button>

        <!-- Cancel button -->
        <button @click="goBack" class="w-full py-3 bg-gray-100 text-gray-800 font-medium rounded-lg"
            :disabled="isLoading">
            Cancel
        </button>

        <!-- Confirmation dialog -->
        <div v-if="showConfirmDialog"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white p-6 rounded-xl max-w-xs w-full">
                <h3 class="text-lg font-bold mb-3">Confirm Deletion?</h3>
                <p class="text-gray-600 mb-6">
                    This action cannot be undone, and all your data will be permanently deleted.
                </p>
                <div class="flex space-x-3">
                    <button @click="showConfirmDialog = false" class="flex-1 py-2 bg-gray-100 rounded-lg">
                        Cancel
                    </button>
                    <button @click="deleteAccount" class="flex-1 py-2 bg-red-600 text-white rounded-lg">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { AlertTriangle } from 'lucide-vue-next';
import { useUserStore } from '@/stores/user.store';
import { useToast } from '@/composables/useToast';
import PageTitle from '@/components/common/PageTitle.vue';

// Initialize router, state management and toast
const router = useRouter();
const userStore = useUserStore();
const toast = useToast();

// Component state
const isLoading = computed(() => userStore.loading);
const error = ref('');
const showConfirmDialog = ref(false);

// Confirm deletion - show secondary confirmation dialog
const confirmDelete = () => {
    error.value = ''; // Clear previous error messages
    showConfirmDialog.value = true;
};

// Execute account deletion
const deleteAccount = async () => {
    try {
        const success = await userStore.deleteAccount({
            password: '' // Pass empty string instead of password
        });

        if (success) {
            toast.success('Your account has been successfully deleted');
            showConfirmDialog.value = false;
            router.replace('/home');
        }
    } catch (err: any) {
        error.value = err.message || 'Failed to delete account';
        toast.error(error.value);
        showConfirmDialog.value = false;
    }
};

// Go back to previous page
const goBack = () => {
    router.back();
};
</script>