<template>
    <div class="pageContent">
        <!-- 页面标题 -->
        <PageTitle :mainTitle="isEdit ? 'Edit Address' : 'Add New Address'" />

        <!-- 间距占位符 -->
        <div class="w-full h-4"></div>

        <!-- 地址表单 -->
        <form @submit.prevent="handleSubmit" class="space-y-5">
            <!-- 收件人姓名 -->
            <div>
                <label for="receiverName" class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" id="receiverName" v-model="form.receiverName"
                    class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                    placeholder="Enter recipient's full name" required />
                <div v-if="errors.receiverName" class="text-red-500 text-xs mt-1">{{ errors.receiverName }}</div>
            </div>

            <!-- 收件人电话 -->
            <div>
                <label for="receiverPhone" class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" id="receiverPhone" v-model="form.receiverPhone"
                    class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                    placeholder="Enter phone number" required />
                <div v-if="errors.receiverPhone" class="text-red-500 text-xs mt-1">{{ errors.receiverPhone }}</div>
            </div>

            <!-- 省份 (固定为 Ulaanbaatar) -->
            <div>
                <label for="province" class="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                <input type="text" id="province" v-model="form.province"
                    class="w-full p-3 border border-gray-200 bg-gray-50 rounded-lg" disabled />
            </div>

            <!-- 城市 -->
            <div>
                <label for="city" class="block text-sm font-medium text-gray-700 mb-1">City</label>
                <select id="city" v-model="form.city"
                    class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                    required>
                    <option value="" disabled>Select a city</option>
                    <option v-for="city in cities" :key="city.id" :value="city.name">
                        {{ city.name }}
                    </option>
                </select>
                <div v-if="errors.city" class="text-red-500 text-xs mt-1">{{ errors.city }}</div>
            </div>

            <!-- 详细地址 -->
            <div>
                <label for="detailAddress" class="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <textarea id="detailAddress" v-model="form.detailAddress"
                    class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black resize-none"
                    rows="3" placeholder="Enter street address, apartment, suite, etc." required></textarea>
                <div v-if="errors.detailAddress" class="text-red-500 text-xs mt-1">{{ errors.detailAddress }}</div>
            </div>

            <!-- 设为默认地址 -->
            <div class="flex items-center mb-3">
                <input type="checkbox" id="isDefault" v-model="form.isDefault" class="w-4 h-4 accent-black" />
                <label for="isDefault" class="ml-2 text-sm text-gray-700">Set as default address</label>
            </div>

            <!-- 提交按钮 -->
            <div class="flex flex-col gap-3 pt-4">
                <button type="submit"
                    class="w-full py-3 bg-black text-white rounded-lg flex items-center justify-center"
                    :disabled="loading">
                    <span v-if="!loading">{{ isEdit ? 'Save Changes' : 'Save Address' }}</span>
                    <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin">
                    </div>
                </button>

                <button type="button" @click="handleCancel" class="w-full py-3 bg-gray-100 text-gray-800 rounded-lg"
                    :disabled="loading">
                    Cancel
                </button>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAddressStore } from '@/stores/address.store';
import { useToast } from '@/composables/useToast';
import PageTitle from '@/components/common/PageTitle.vue';
import type { UserAddress, CreateAddressParams, UpdateAddressParams } from '@/types/address.type';

const router = useRouter();
const route = useRoute();
const addressStore = useAddressStore();
const toast = useToast();

// 城市数据
const cities = [
    { id: 1, provinceId: 1, name: 'Baynzurh' },
    { id: 2, provinceId: 1, name: 'Baganuur' },
    { id: 3, provinceId: 1, name: 'Songinokhairhan' },
    { id: 4, provinceId: 1, name: 'Chingeltei' },
    { id: 5, provinceId: 1, name: 'KhanUul' },
    { id: 6, provinceId: 1, name: 'Sukhbaatar' },
    { id: 7, provinceId: 1, name: 'Bagakhangai' },
    { id: 8, provinceId: 1, name: 'Nalaih' },
    { id: 9, provinceId: 1, name: 'Bayangol' },
];

// 表单数据
const form = reactive<{
    receiverName: string;
    receiverPhone: string;
    province: string;
    city: string;
    detailAddress: string;
    isDefault: boolean;
}>({
    receiverName: '',
    receiverPhone: '',
    province: 'Ulaanbaatar', // 固定值
    city: '',
    detailAddress: '',
    isDefault: false,
});

// 错误信息
const errors = reactive({
    receiverName: '',
    receiverPhone: '',
    city: '',
    detailAddress: '',
});

// 加载状态
const loading = computed(() => addressStore.loading);

// 编辑模式标识
const isEdit = computed(() => !!route.query.edit && route.query.id);
const addressId = computed(() => route.query.id ? parseInt(route.query.id as string) : null);

// 组件挂载时，如果是编辑模式，则获取地址数据
onMounted(async () => {
    if (isEdit.value && addressId.value) {
        // 确保地址列表已加载
        if (addressStore.addresses.length === 0 && !addressStore.isInitializing) {
            await addressStore.fetchAddresses();
        }

        // 查找当前编辑的地址
        const address = addressStore.addresses.find(addr => addr.id === addressId.value);
        if (address) {
            fillFormWithAddress(address);
        } else {
            toast.error('Address not found');
            router.push('/address');
        }
    }
});

// 填充表单数据
const fillFormWithAddress = (address: UserAddress) => {
    form.receiverName = address.receiverName;
    form.receiverPhone = address.receiverPhone;
    form.province = address.province;
    form.city = address.city;
    form.detailAddress = address.detailAddress;
    form.isDefault = address.isDefault === 1;
};

// 验证表单
const validateForm = (): boolean => {
    let isValid = true;

    // 重置错误信息
    Object.keys(errors).forEach(key => {
        errors[key as keyof typeof errors] = '';
    });

    // 验证收件人姓名
    if (!form.receiverName.trim()) {
        errors.receiverName = 'Please enter a name';
        isValid = false;
    }

    // 验证收件人电话
    if (!form.receiverPhone.trim()) {
        errors.receiverPhone = 'Please enter a phone number';
        isValid = false;
    } else if (!/^\d{8,11}$/.test(form.receiverPhone)) {
        errors.receiverPhone = 'Please enter a valid 8 digit phone number';
        isValid = false;
    }

    // 验证城市
    if (!form.city) {
        errors.city = 'Please select a city';
        isValid = false;
    }

    // 验证详细地址
    if (!form.detailAddress.trim()) {
        errors.detailAddress = 'Please enter a street address';
        isValid = false;
    }

    return isValid;
};

// 提交表单
const handleSubmit = async () => {
    if (!validateForm()) {
        return;
    }

    try {
        const params: CreateAddressParams | UpdateAddressParams = {
            receiverName: form.receiverName.trim(),
            receiverPhone: form.receiverPhone.trim(),
            province: form.province,
            city: form.city,
            detailAddress: form.detailAddress.trim(),
            isDefault: form.isDefault ? 1 : 0,
        };

        if (isEdit.value && addressId.value) {
            // 编辑地址
            await addressStore.updateAddress(addressId.value, params);
            toast.success('Address updated successfully');
        } else {
            // 新建地址
            await addressStore.createAddress(params);
            toast.success('Address added successfully');
        }

        router.replace({
            path: '/address',
            query: { from: 'editor' }  // 添加来源标记
        });
    } catch (error: any) {
        toast.error(error.message || 'Failed to save address');
    }
};

// 取消操作
const handleCancel = () => {
    router.replace({
        path: '/address',
        query: { from: 'editor' }  // 添加来源标记
    });
};
</script>