<!-- src/components/checkout/AddressSelector.vue -->
<template>
    <div class="bg-white p-4">
        <!-- Header -->
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-medium">Shipping Address</h2>
            <div @click="goToAddressList" class="flex items-center text-sm text-gray-500 cursor-pointer hover:text-black transition-colors">
                <span>Manage</span>
                <ChevronRight :size="16" class="ml-1" />
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="py-3 flex items-center text-gray-500">
            <div class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-gray-300 border-r-transparent mr-2"></div>
            <span>Loading addresses...</span>
        </div>

        <!-- No Addresses State -->
        <div v-else-if="addresses.length === 0" class="py-6 flex flex-col items-center justify-center text-gray-500">
            <MapPin :size="32" class="text-gray-400 mb-3" />
            <span class="mb-3">No shipping addresses found</span>
            <button @click="goToAddressList" class="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                Add Address
            </button>
        </div>

        <!-- Address Display -->
        <div v-else>
            <!-- Selected Address Card -->
            <div v-if="selectedAddress" class="p-4 bg-gray-50 rounded-lg mb-4">
                <div class="flex justify-between items-start">
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
            </div>

            <!-- Address Selection Button -->
            <button @click="showAddressModal = true" 
                class="w-full py-2 px-4 bg-gray-50 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center">
                <span>{{ addresses.length > 1 ? 'Change Address' : 'Select Address' }}</span>
            </button>
        </div>

        <!-- Address Selection Modal -->
        <div v-if="showAddressModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div class="bg-white rounded-xl w-11/12 max-w-md max-h-[80vh] flex flex-col overflow-hidden">
                <!-- Modal Header -->
                <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="text-lg font-medium">Select Shipping Address</h3>
                    <button @click="showAddressModal = false" class="text-gray-400 hover:text-gray-600 transition-colors">
                        <X :size="20" />
                    </button>
                </div>
                
                <!-- Modal Content -->
                <div class="overflow-y-auto flex-1 p-6">
                    <div v-for="address in addresses" :key="address.id" 
                         @click="selectAddress(address.id)"
                         class="p-4 rounded-lg mb-3 cursor-pointer transition-all"
                         :class="selectedAddressId === address.id ? 
                            'bg-gray-50' : 
                            'hover:bg-gray-50'">
                        
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="font-medium">{{ address.receiverName }}</div>
                                <div class="text-gray-500 mt-1">{{ address.receiverPhone }}</div>
                                <div class="mt-2 text-gray-600 text-sm">
                                    {{ `${address.province} ${address.city} ${address.detailAddress}` }}
                                </div>
                            </div>
                            
                            <div class="flex flex-col items-end">
                                <div v-if="selectedAddressId === address.id" class="w-5 h-5 rounded-full bg-black flex items-center justify-center mb-2">
                                    <div class="w-2 h-2 rounded-full bg-white"></div>
                                </div>
                                <div v-if="address.isDefault === 1">
                                    <span class="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">Default</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Divider line between addresses -->
                        <div v-if="address.id !== addresses[addresses.length-1].id" class="h-px bg-gray-100 mt-4"></div>
                    </div>
                </div>
                
                <!-- Modal Footer -->
                <div class="p-6 border-t border-gray-100 flex justify-between">
                    <button @click="goToAddressList" 
                        class="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                        Add New Address
                    </button>
                    <button @click="showAddressModal = false" 
                        class="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                        Confirm
                    </button>
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
        tempOrderStore.updateTempOrder({
            addressId: addressId
        });
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
            await addressStore.loadAddresses();

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