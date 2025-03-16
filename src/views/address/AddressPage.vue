<template>
    <div class="pageContent pb-20">
        <!-- 页面标题 -->
        <PageTitle mainTitle="My Addresses" />

        <!-- 间距占位符 -->
        <div class="w-full h-4"></div>

        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center h-40">
            <div
                class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-r-transparent align-middle">
            </div>
        </div>

        <!-- 空地址状态 -->
        <div v-else-if="addresses.length === 0" class="flex flex-col items-center justify-center h-60">
            <MapPin class="w-12 h-12 text-gray-300 mb-2" />
            <div class="text-gray-500 mb-4">You haven't added any addresses yet</div>
            <button @click="handleAddAddress" class="bg-black text-white py-2 px-6 rounded-full flex items-center">
                <Plus class="w-4 h-4 mr-1" />
                Add New Address
            </button>
        </div>

        <!-- 地址列表 -->
        <div v-else class="space-y-4">
            <div v-for="address in addresses" :key="address.id"
                class="bg-white p-4 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.08)]">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center">
                        <span class="font-medium text-gray-800">{{ address.receiverName }}</span>
                        <span class="text-gray-500 ml-2">{{ address.receiverPhone }}</span>
                    </div>
                    <div class="flex space-x-2">
                        <button @click="handleEdit(address)" class="p-1 rounded-full hover:bg-gray-100">
                            <Pencil class="w-4 h-4 text-gray-500" />
                        </button>
                        <button @click="confirmDelete(address.id)" class="p-1 rounded-full hover:bg-gray-100">
                            <Trash2 class="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>
                <div class="text-gray-600 text-sm mb-3">
                    {{ address.province }} {{ address.city }} {{ address.detailAddress }}
                </div>
                <div class="flex justify-between items-center">
                    <div v-if="address.isDefault === 1"
                        class="inline-flex items-center text-xs px-2 py-1 bg-black text-white rounded-full">
                        Default Address
                    </div>
                    <button v-else @click="handleSetDefault(address.id)" class="text-xs text-gray-500 underline">
                        Set as Default
                    </button>

                    <div class="flex items-center text-xs text-gray-400">
                        {{ formatDate(address.updatedAt) }}
                    </div>
                </div>
            </div>

            <!-- 添加地址按钮 - 悬浮在底部 -->
            <div v-if="addresses.length < 10" class="fixed bottom-20 right-6">
                <button @click="handleAddAddress"
                    class="bg-black text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg">
                    <Plus class="w-6 h-6" />
                </button>
            </div>

            <!-- 提示已达到地址上限 -->
            <div v-else class="text-center text-gray-500 mt-4">
                You can add up to 10 addresses
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-vue-next';
import { useAddressStore } from '@/stores/address.store';
import { useToast } from '@/composables/useToast';
import PageTitle from '@/components/common/PageTitle.vue';
import type { UserAddress } from '@/types/address.type';

const router = useRouter();
const addressStore = useAddressStore();
const toast = useToast();

// 计算属性
const addresses = computed(() => addressStore.addresses);
const loading = computed(() => addressStore.loading);

// 在组件挂载时获取地址数据，如果尚未初始化
onMounted(async () => {
    // 如果地址数据未初始化，则获取数据
    if (!addressStore.isInitialized && !addressStore.isInitializing) {
        await addressStore.fetchAddresses();
    } else {
        // 如果已初始化，则刷新地址数据（可选）
        await addressStore.refreshAddressesIfNeeded();
    }
});

// 格式化时间
const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`;
};

// 新增地址
const handleAddAddress = () => {
    router.push('/new-address');
};

// 编辑地址
const handleEdit = (address: UserAddress) => {
    router.push({
        path: '/new-address',
        query: {
            id: address.id.toString(),
            edit: 'true'
        }
    });
};

// 设置默认地址
const handleSetDefault = async (id: number) => {
    try {
        await addressStore.setDefaultAddress(id);
        toast.success('Set as default address successfully');
    } catch (error: any) {
        toast.error(error.message || 'Failed to set default address');
    }
};

// 确认删除地址
const confirmDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
        handleDelete(id);
    }
};

// 删除地址
const handleDelete = async (id: number) => {
    try {
        await addressStore.deleteAddress(id);
        toast.success('Address deleted successfully');
    } catch (error: any) {
        toast.error(error.message || 'Failed to delete address');
    }
};
</script>