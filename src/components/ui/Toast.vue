<!-- src/components/ui/Toast.vue -->
<template>
    <Transition name="toast-fade">
        <div v-if="visible" class="fixed inset-x-0 top-16 flex items-center justify-center z-50 pointer-events-none"
            :class="[position === 'top' ? 'top-16' : 'bottom-16']">
            <div class="flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg pointer-events-auto transition-all duration-300 max-w-xs sm:max-w-sm"
                :class="[
                    type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                        type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                            type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                                'bg-blue-50 text-blue-800 border border-blue-200'
                ]">
                <!-- Icon -->
                <div class="flex-shrink-0">
                    <CheckCircle v-if="type === 'success'" class="w-5 h-5 text-green-500" />
                    <XCircle v-else-if="type === 'error'" class="w-5 h-5 text-red-500" />
                    <AlertTriangle v-else-if="type === 'warning'" class="w-5 h-5 text-yellow-500" />
                    <Info v-else class="w-5 h-5 text-blue-500" />
                </div>
                <!-- Message -->
                <div class="flex-1 text-sm">{{ message }}</div>
                <!-- Close button -->
                <button @click="close" class="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 focus:outline-none">
                    <X class="w-4 h-4" />
                </button>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom';

const props = defineProps<{
    message: string;
    type: ToastType;
    duration?: number;
    position?: ToastPosition;
}>();

const emit = defineEmits<{
    close: [];
}>();

const visible = ref(false);
let timeoutId: number | null = null;

const close = () => {
    visible.value = false;
    setTimeout(() => {
        emit('close');
    }, 300); // Allow time for transition to complete
};

onMounted(() => {
    visible.value = true;

    if (props.duration !== 0) {
        timeoutId = window.setTimeout(() => {
            close();
        }, props.duration || 3000);
    }
});

onBeforeUnmount(() => {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
});
</script>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
    transition: opacity 0.3s, transform 0.3s;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
    opacity: 0;
    transform: translateY(-20px);
}
</style>