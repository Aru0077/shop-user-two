<!-- src/components/cart/QuantityAdjuster.vue -->
<template>
    <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden h-8">
        <button @click="decrease"
            class="w-8 h-full flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
            :disabled="quantity <= minQuantity || disabled || isUpdating">
            <Minus :size="16" :class="{ 'text-gray-300': quantity <= minQuantity || disabled || isUpdating }" />
        </button>
        <div class="w-10 h-full flex items-center justify-center bg-white text-sm relative"
            :class="{ 'text-gray-400': isUpdating }">
            {{ quantity }}
            <span v-if="isUpdating" class="absolute inset-0 flex items-center justify-center">
                <div class="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
            </span>
        </div>
        <button @click="increase"
            class="w-8 h-full flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
            :disabled="quantity >= maxQuantity || disabled || isUpdating">
            <Plus :size="16" :class="{ 'text-gray-300': quantity >= maxQuantity || disabled || isUpdating }" />
        </button>
    </div>
</template>

<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next';

const props = defineProps({
    quantity: {
        type: Number,
        required: true
    },
    minQuantity: {
        type: Number,
        default: 1
    },
    maxQuantity: {
        type: Number,
        default: undefined
    },
    disabled: {
        type: Boolean,
        default: false
    },
    isUpdating: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits<{
    'update:quantity': [value: number];
}>();

const decrease = () => {
    if (props.quantity > (props.minQuantity || 1) && !props.disabled && !props.isUpdating) {
        emit('update:quantity', props.quantity - 1);
    }
};

const increase = () => {
    if (!props.disabled && !props.isUpdating && (props.maxQuantity === undefined || props.quantity < props.maxQuantity)) {
        emit('update:quantity', props.quantity + 1);
    }
};
</script>