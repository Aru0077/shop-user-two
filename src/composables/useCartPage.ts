// src/views/cart/composables/useCartPage.ts
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '@/stores/cart.store';
import { useUserStore } from '@/stores/user.store';
import { useTempOrderStore } from '@/stores/temp-order.store';
import { useToast } from '@/composables/useToast';

/**
 * 购物车页面业务逻辑
 */
export function useCartPage() {
      // 初始化
      const router = useRouter();
      const cartStore = useCartStore();
      const userStore = useUserStore();
      const tempOrderStore = useTempOrderStore();
      const toast = useToast();

      // 状态
      const loading = ref(false);
      const isEditMode = ref(false);
      const processingIds = ref<number[]>([]); // 正在处理的商品ID（用于加载状态）

      // 计算属性
      const cartItems = computed(() => cartStore.items);
      const selectedItems = computed(() => cartStore.selectedItems);
      const selectedItemsData = computed(() => cartStore.selectedItemsData);
      const totalSelectedAmount = computed(() => cartStore.selectedTotalAmount);

      const isAllSelected = computed(() => {
            const availableItems = cartItems.value.filter(item => item.isAvailable);
            if (availableItems.length === 0) return false;
            return availableItems.every(item => cartStore.isItemSelected(item.id));
      });

      // 检查商品是否被选中
      const isItemSelected = (id: number): boolean => {
            return cartStore.isItemSelected(id);
      };

      // 切换商品选中状态
      const toggleSelectItem = (id: number) => {
            const item = cartItems.value.find(item => item.id === id);
            // 只允许选择可购买的商品
            if (!item || !item.isAvailable) return;
            cartStore.toggleSelectCartItem(id);
      };

      // 全选/取消全选
      const toggleSelectAll = () => {
            cartStore.toggleSelectAll(!isAllSelected.value);
      };

      // 切换编辑模式
      const toggleEditMode = () => {
            isEditMode.value = !isEditMode.value;
      };

      // 更新商品数量
      const updateItemQuantity = async (id: number, quantity: number) => {
            if (processingIds.value.includes(id)) return;

            try {
                  processingIds.value.push(id);
                  await cartStore.updateCartItem(id, { quantity });
            } catch (error: any) {
                  toast.error(error.message || 'Failed to update quantity');
            } finally {
                  processingIds.value = processingIds.value.filter(itemId => itemId !== id);
            }
      };

      // 移除单个商品
      const removeItem = async (id: number) => {
            if (processingIds.value.includes(id)) return;

            try {
                  processingIds.value.push(id);
                  await cartStore.deleteCartItem(id);
            } catch (error: any) {
                  toast.error(error.message || 'Failed to delete');
            } finally {
                  processingIds.value = processingIds.value.filter(itemId => itemId !== id);
            }
      };

      // 批量删除商品
      const batchRemove = async () => {
            if (selectedItems.value.length === 0) return;

            const confirmed = window.confirm(`Confirm to delete selected ${selectedItems.value.length} items?`);
            if (!confirmed) return;

            loading.value = true;
            let hasError = false;

            try {
                  // 一个个删除，因为 API 不支持批量删除
                  for (const id of [...selectedItems.value]) {
                        try {
                              await cartStore.deleteCartItem(id);
                        } catch (error) {
                              hasError = true;
                              console.error(`删除商品 ${id} 失败:`, error);
                        }
                  }

                  if (hasError) {
                        toast.warning('Some items failed to delete, please try again');
                  } else {
                        toast.success('Selected items deleted');
                  }
            } catch (error: any) {
                  toast.error(error.message || 'Batch delete failed');
            } finally {
                  loading.value = false;
            }
      };

      // 去结算 创建临时订单
      const checkout = async () => {
            if (selectedItems.value.length === 0) {
                  toast.error('Please select items to checkout');
                  return;
            }

            // 检查用户是否登录
            if (!userStore.isLoggedIn) {
                  toast.info('Please log in first');
                  router.push({
                        path: '/login',
                        query: { redirect: '/cart' }
                  });
                  return;
            }

            loading.value = true;
            try {
                  // 确保临时订单store已初始化
                  await tempOrderStore.ensureInitialized();

                  const tempOrder = await tempOrderStore.createTempOrder({
                        mode: 'cart',
                        cartItemIds: selectedItems.value
                  });

                  if (!tempOrder) {
                        throw new Error('Failed to create temporary order');
                  }

                  // 跳转到结账页面
                  router.push({
                        path: '/checkout',
                        query: {
                              tempOrderId: tempOrder.id
                        }
                  });
            } catch (error: any) {
                  toast.error(error.message || 'Failed to create order, please try again');
                  console.error('创建临时订单失败:', error);
            } finally {
                  loading.value = false;
            }
      };

      // 去首页购物
      const goToHome = () => {
            router.push('/home');
      };

      // 初始化数据
      const initCart = async () => {
            loading.value = true;
            try {
                  // 确保购物车已初始化
                  cartStore.isInitialized();

                  // 刷新购物车数据
                  if (userStore.isLoggedIn) {
                        await cartStore.loadCartItems();
                  }

                  // 编辑模式初始状态
                  isEditMode.value = false;
            } catch (error: any) {
                  toast.error('Failed to load the cart, please refresh the page');
                  console.error('初始化购物车失败:', error);
            } finally {
                  loading.value = false;
            }
      };

      // 检查商品是否正在处理中
      const isProcessing = (id: number): boolean => {
            return processingIds.value.includes(id);
      };

      // 监听cart store加载状态
      watch(() => cartStore.loading, (newLoading) => {
            if (loading.value !== newLoading) {
                  loading.value = newLoading;
            }
      });

      // 组件挂载时初始化
      onMounted(() => {
            initCart();
      });

      return {
            // 状态
            loading,
            isEditMode,
            cartItems,
            selectedItems,
            selectedItemsData,
            totalSelectedAmount,
            isAllSelected,

            // 方法
            isItemSelected,
            toggleSelectItem,
            toggleSelectAll,
            toggleEditMode,
            updateItemQuantity,
            removeItem,
            batchRemove,
            checkout,
            goToHome,
            initCart,
            isProcessing
      };
}