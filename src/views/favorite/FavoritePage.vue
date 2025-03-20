<template>
    <div class="pageContent">
        <!-- 页面标题 -->
        <div class="flex justify-between items-center">
            <PageTitle mainTitle="My Favorites" />
            <div v-if="favorites.length > 0" @click="toggleEditMode" class="text-sm font-medium">
                {{ isEditMode ? 'Done' : 'Edit' }}
            </div>
        </div>

        <!-- 间距占位符 -->
        <div class="w-full h-4"></div>

        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center h-40">
            <div
                class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-r-transparent align-middle">
            </div>
        </div>

        <!-- 空收藏状态 -->
        <EmptyFavorites v-else-if="favorites.length === 0" @shop-now="goToHome" />

        <!-- 收藏列表 -->
        <div v-else>
            <!-- 编辑模式下的全选控制 -->
            <div v-if="isEditMode" class="flex items-center mb-4 bg-white p-3 rounded-lg shadow-sm">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll"
                    class="w-5 h-5 accent-black mr-2" />
                <span class="text-sm">Select All</span>
                <span class="text-sm text-gray-500 ml-2">({{ selectedItems.length }}/{{ favorites.length }})</span>
            </div>

            <!-- 网格布局展示收藏商品 -->
            <div class="grid grid-cols-2 gap-4">
                <div v-for="item in favorites" :key="item.id"
                    class="bg-white rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.08)] overflow-hidden relative">
                    <!-- 商品选择器 (编辑模式下) -->
                    <div v-if="isEditMode" class="absolute top-2 left-2 z-10">
                        <input type="checkbox" :checked="isItemSelected(item.id)" @change="toggleSelectItem(item.id)"
                            class="w-5 h-5 accent-black" />
                    </div>

                    <!-- 商品图片 -->
                    <div class="aspect-square relative" @click="!isEditMode && goToProductDetail(item.productId)">
                        <img :src="item.product?.mainImage || 'https://img.js.design/assets/img/60f77157d961d24e3cf7493e.png'"
                            :alt="item.product?.name || 'Product image'" class="w-full h-full object-cover" />
                    </div>

                    <!-- 商品信息 -->
                    <div class="p-3">
                        <div class="text-sm font-medium line-clamp-1">{{ item.product?.name || 'Product name' }}</div>
                        <div class="flex justify-between items-center mt-1">
                            <!-- 价格 -->
                            <div class="text-sm font-bold text-red-500">
                                {{ formatPrice(item.product) }}
                            </div>
                            <!-- 操作按钮 -->
                            <button v-if="!isEditMode" @click="removeFavorite(item.productId)"
                                class="p-1 rounded-full hover:bg-gray-100">
                                <Trash2 class="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 批量操作浮动按钮 (编辑模式下) -->
            <div v-if="isEditMode && selectedItems.length > 0" class="fixed bottom-10 inset-x-0 px-4">
                <button @click="batchRemoveFavorites"
                    class="w-full py-3 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg">
                    <Trash2 class="w-5 h-5 mr-2" />
                    Remove Selected ({{ selectedItems.length }})
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Trash2 } from 'lucide-vue-next';
import { useFavoriteStore } from '@/stores/favorite.store';
import { useToast } from '@/composables/useToast';
import PageTitle from '@/components/common/PageTitle.vue';
import type { Product } from '@/types/product.type';
import { getFormattedPrice } from '@/utils/price.utils';
import EmptyFavorites from '@/components/favorite/EmptyFavorites.vue';

// 初始化路由和存储
const router = useRouter();
const favoriteStore = useFavoriteStore();
const toast = useToast();

// 组件状态
const loading = ref(true);
const isEditMode = ref(false);
const selectedItems = ref<number[]>([]); // 存储选中项的ID 
const pageSize = ref(20);

// 计算属性
const favorites = computed(() => favoriteStore.favorites);
const isAllSelected = computed(() => {
    if (favorites.value.length === 0) return false;
    return favorites.value.every(item => isItemSelected(item.id));
});

// 检查项目是否被选中
const isItemSelected = (id: number): boolean => {
    return selectedItems.value.includes(id);
};

// 切换编辑模式
const toggleEditMode = () => {
    isEditMode.value = !isEditMode.value;
    // 切换回非编辑模式时清空选择
    if (!isEditMode.value) {
        selectedItems.value = [];
    }
};

// 切换选择状态
const toggleSelectItem = (id: number) => {
    const index = selectedItems.value.indexOf(id);
    if (index === -1) {
        selectedItems.value.push(id);
    } else {
        selectedItems.value.splice(index, 1);
    }
};

// 全选/取消全选
const toggleSelectAll = () => {
    if (isAllSelected.value) {
        selectedItems.value = [];
    } else {
        selectedItems.value = favorites.value.map(item => item.id);
    }
};

// 跳转到商品详情
const goToProductDetail = (productId: number) => {
    router.push(`/product/${productId}`);
};

// 跳转到首页
const goToHome = () => {
    router.push('/home');
};

// 格式化价格
const formatPrice = (product?: Product | null): string => {
    return product ? getFormattedPrice(product) : 'Price unknown';
};

// 移除单个收藏
const removeFavorite = async (productId: number) => {
    try {
        const success = await favoriteStore.removeFavorite(productId);
        if (success) {
            toast.success('已从收藏中移除');
        } else {
            toast.error('移除收藏失败');
        }
    } catch (error: any) {
        toast.error(error.message || '移除收藏失败');
    }
};

// 批量移除收藏
const batchRemoveFavorites = async () => {
    if (selectedItems.value.length === 0) return;

    try {
        // 获取选中项的商品ID
        const productIds: number[] = [];
        for (const itemId of selectedItems.value) {
            const favorite = favorites.value.find(f => f.id === itemId);
            if (favorite) {
                productIds.push(favorite.productId);
            }
        }

        if (productIds.length === 0) return;

        const success = await favoriteStore.batchRemoveFavorites(productIds);
        if (success) {
            toast.success(`已移除${productIds.length}项收藏`);
            // 清空选择
            selectedItems.value = [];
            // 如果已经没有收藏了，退出编辑模式
            if (favorites.value.length === 0) {
                isEditMode.value = false;
            }
        } else {
            toast.error('批量移除收藏失败');
        }
    } catch (error: any) {
        toast.error(error.message || '批量移除收藏失败');
    }
};

// 获取收藏列表
const fetchFavorites = async (page = 1) => {
    loading.value = true;
    try {
        await favoriteStore.getFavorites(page, pageSize.value);
    } catch (error) {
        toast.error((error as Error).message || '加载收藏失败');
    } finally {
        loading.value = false;
    }
};

// 组件挂载时获取收藏列表
onMounted(async () => {
    loading.value = true;
    try {
        // 确保 favoriteStore 已初始化
        await favoriteStore.ensureInitialized();
        await fetchFavorites(1);
    } catch (error) {
        console.error('获取收藏列表失败:', error);
        toast.error('加载收藏失败');
    } finally {
        loading.value = false;
    }
});
</script>