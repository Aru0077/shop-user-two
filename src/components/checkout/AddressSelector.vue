<!-- src/components/checkout/AddressSelector.vue -->
<template>
    <div class="bg-white rounded-xl p-4 mb-4 shadow-sm">
        <!-- 标题 -->
        <div class="flex justify-between items-center mb-3">
            <h3 class="text-[16px] font-bold">收货地址</h3>
            <div @click="goToAddressList" class="flex items-center text-xs text-gray-500 cursor-pointer">
                <span>管理地址</span>
                <ChevronRight :size="16" class="ml-1" />
            </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="py-2 flex items-center text-gray-500">
            <div class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-gray-500 border-r-transparent mr-2"></div>
            <span>加载地址中...</span>
        </div>

        <!-- 没有地址 -->
        <div v-else-if="addresses.length === 0" class="py-2 flex flex-col items-center justify-center text-gray-500">
            <MapPin :size="28" class="text-gray-400 mb-2" />
            <span class="mb-2">您还没有收货地址</span>
            <button @click="goToAddressList" class="px-4 py-2 bg-gray-100 rounded-full text-sm">添加地址</button>
        </div>

        <!-- 地址列表 -->
        <div v-else>
            <!-- 选中的地址 -->
            <div v-if="selectedAddress" class="p-3 border border-gray-200 rounded-lg mb-3">
                <div class="flex justify-between">
                    <div class="font-medium">{{ selectedAddress.receiverName }}</div>
                    <div>{{ selectedAddress.receiverPhone }}</div>
                </div>
                <div class="mt-1 text-gray-600 text-sm">
                    {{ `${selectedAddress.province} ${selectedAddress.city} ${selectedAddress.detailAddress}` }}
                </div>
                <div v-if="selectedAddress.isDefault === 1" class="mt-2">
                    <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">默认</span>
                </div>
            </div>

            <!-- 切换地址按钮 -->
            <div v-if="addresses.length > 1" @click="showAddressModal = true" class="flex justify-center">
                <button class="px-4 py-2 bg-gray-100 rounded-full text-sm">切换地址</button>
            </div>
        </div>

        <!-- 地址选择弹窗 -->
        <div v-if="showAddressModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div class="bg-white rounded-lg w-11/12 max-w-md max-h-[80vh] flex flex-col">
                <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="font-bold">选择收货地址</h3>
                    <X @click="showAddressModal = false" class="cursor-pointer" />
                </div>
                <div class="overflow-y-auto flex-1 p-4">
                    <div v-for="address in addresses" :key="address.id" 
                         @click="selectAddress(address.id)"
                         class="p-3 border border-gray-200 rounded-lg mb-3"
                         :class="{'border-black': selectedAddressId === address.id}">
                        <div class="flex justify-between">
                            <div class="font-medium">{{ address.receiverName }}</div>
                            <div>{{ address.receiverPhone }}</div>
                        </div>
                        <div class="mt-1 text-gray-600 text-sm">
                            {{ `${address.province} ${address.city} ${address.detailAddress}` }}
                        </div>
                        <div v-if="address.isDefault === 1" class="mt-2">
                            <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">默认</span>
                        </div>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-200">
                    <button @click="showAddressModal = false" class="w-full py-2 bg-black text-white rounded-lg">确定</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { MapPin, ChevronRight, X } from 'lucide-vue-next';
import { useAddressStore } from '@/stores/address.store';
import { useTempOrderStore } from '@/stores/temp-order.store';
import { useToast } from '@/composables/useToast';
// import type { UserAddress } from '@/types/address.type';

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
const tempOrderStore = useTempOrderStore();
const toast = useToast();

// 状态
const showAddressModal = ref(false);
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

// 选择地址
const selectAddress = (addressId: number) => {
    selectedAddressId.value = addressId;
    // 更新临时订单中的地址
    if (tempOrderStore.tempOrder) {
        tempOrderStore.setSelectedAddress(addressId);
    }
};

// 跳转到地址列表
const goToAddressList = () => {
    router.push({
        path: '/address',
        query: { from: 'checkout', redirect: router.currentRoute.value.fullPath }
    });
};

// 初始化时加载地址列表
onMounted(async () => {
    if (addresses.value.length === 0) {
        try {
            await addressStore.fetchAddresses();
            
            // 如果有默认地址且没有选中的地址，则选择默认地址
            if (!selectedAddressId.value && addressStore.defaultAddress) {
                selectAddress(addressStore.defaultAddress.id);
            }
            // 如果没有默认地址但有地址，选择第一个
            else if (!selectedAddressId.value && addresses.value.length > 0) {
                selectAddress(addresses.value[0].id);
            }
        } catch (error) {
            toast.error('获取地址失败');
        }
    }
});

// 监听地址变化
watch(addresses, (newAddresses) => {
    // 如果当前选中的地址不在列表中，重置选择
    if (selectedAddressId.value && !newAddresses.some(addr => addr.id === selectedAddressId.value)) {
        if (addressStore.defaultAddress) {
            selectAddress(addressStore.defaultAddress.id);
        } else if (newAddresses.length > 0) {
            selectAddress(newAddresses[0].id);
        } else {
            selectedAddressId.value = null;
        }
    }
}, { deep: true });
</script>