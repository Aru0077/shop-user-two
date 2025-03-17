<!-- src/components/cart/QuantityAdjuster.vue -->
<template>
    <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden h-8">
        <button 
            @click="decrease" 
            class="w-8 h-full flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
            :disabled="quantity <= minQuantity || disabled"
        >
            <Minus :size="16" :class="{'text-gray-300': quantity <= minQuantity || disabled}" />
        </button>
        <div class="w-10 h-full flex items-center justify-center bg-white text-sm">
            {{ quantity }}
        </div>
        <button 
            @click="increase" 
            class="w-8 h-full flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
            :disabled="quantity >= maxQuantity || disabled"
        >
            <Plus :size="16" :class="{'text-gray-300': quantity >= maxQuantity || disabled}" />
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
    }
});

const emit = defineEmits<{
    'update:quantity': [value: number];
}>();

const decrease = () => {
    if (props.quantity > (props.minQuantity || 1) && !props.disabled) {
        emit('update:quantity', props.quantity - 1);
    }
};

const increase = () => {
    if (!props.disabled && (props.maxQuantity === undefined || props.quantity < props.maxQuantity)) {
        emit('update:quantity', props.quantity + 1);
    }
};
</script>