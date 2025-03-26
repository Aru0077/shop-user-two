<template>
    <div class="bg-white p-4" @click="goToAddressList">
        <!-- Header -->
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-medium">Shipping Address</h2>
            <div class="p-1 rounded-full hover:bg-gray-100 cursor-pointer">
                <ChevronRight :size="16" class="text-gray-500" />
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="py-3 flex items-center text-gray-500">
            <div
                class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-gray-300 border-r-transparent mr-2">
            </div>
            <span>Loading addresses...</span>
        </div>

        <!-- No Addresses State -->
        <div v-else-if="addresses.length === 0" class="py-6 flex flex-col items-center justify-center">
            <MapPin :size="32" class="text-gray-400 mb-3" />
            <span class="mb-3 text-red-500 font-medium">Select Address</span>
        </div>

        <!-- Address Display -->
        <div v-else class="p-4 bg-gray-50 rounded-lg">
            <div v-if="selectedAddress" class="flex justify-between items-start">
                <div>
                    <div class="font-medium">{{ selectedAddress.receiverName }}</div>
                    <div class="text-gray-500 mt-1">{{ selectedAddress.receiverPhone }}</div>
                    <div class="mt-2 text-gray-600 text-sm">
                        {{ `${selectedAddress.province} ${selectedAddress.city} ${selectedAddress.detailAddress}` }}
                    </div>
                </div>
                <div v-if="selectedAddress.isDefault === 1" class="ml-2">
                    <span class="text-xs px-2 py-1 bg-white text-gray-500 rounded-full">Default</span>
                </div>
            </div>
            <div v-else class="text-red-500 font-medium">Select Address</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { MapPin, ChevronRight } from 'lucide-vue-next';
import { useAddressStore } from '@/stores/address.store';
import { useToast } from '@/composables/useToast';

// 组件属性
const props = defineProps<{
    value: number | null;
}>();

// 组件事件
const emit = defineEmits<{
    'update:value': [value: number | null];
}>();

// 初始化
const router = useRouter();
const addressStore = useAddressStore();
const toast = useToast();

// 状态
const selectedAddressId = computed({
    get: () => props.value,
    set: (val) => emit('update:value', val)
});

// 地址数据
const addresses = computed(() => addressStore.addresses);
const loading = computed(() => addressStore.loading);
const selectedAddress = computed(() =>
    addresses.value.find(addr => addr.id === selectedAddressId.value) || null
);

// 跳转到地址列表
const goToAddressList = () => {
    router.push({
        path: '/address',
        query: {
            from: 'checkout',
            redirect: router.currentRoute.value.fullPath,
            selectedId: selectedAddressId.value ? selectedAddressId.value.toString() : undefined
        }
    });
};

// 初始化时加载地址列表 
onMounted(async () => {
    try {
        // 检查 store 是否已初始化
        if (!addressStore.isInitialized()) {
            await addressStore.init();
        }
        // 如果地址列表为空，才请求地址列表
        else if (addresses.value.length === 0) {
            await addressStore.loadAddresses();
        }

        // 如果尚未选择地址
        if (!selectedAddressId.value) {
            // 优先选择默认地址
            if (addressStore.defaultAddress) {
                selectedAddressId.value = addressStore.defaultAddress.id;
            }
            // 如果没有默认地址但有其他地址，选择第一个
            else if (addresses.value.length > 0) {
                selectedAddressId.value = addresses.value[0].id;
            }
        }
    } catch (error) {
        toast.error('获取地址失败');
    }
});
</script>