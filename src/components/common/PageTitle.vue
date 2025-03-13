<template>
    <div>
        <!-- If only main title is provided -->
        <template v-if="subtitle === ''">
            <div class="text-[25px] font-bold text-black">{{ mainTitle }}</div>
        </template>

        <!-- If both titles are provided -->
        <template v-else>
            <div class="text-[25px] font-bold text-black">{{ mainTitle }}</div>
            <div class="text-[20px] font-bold text-gray-500">{{ subtitle }}</div>
        </template>
    </div>
</template>

<script setup lang="ts">

defineProps({
    mainTitle: {
        type: String,
        required: true,
        default: 'Welcome'
    },
    subtitle: {
        type: String,
        default: ''
    }
});

</script> 