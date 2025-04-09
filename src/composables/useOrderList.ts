// src/composables/useOrderList.ts
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useOrderStore } from '@/stores/order.store';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/composables/useToast';
import { storage } from '@/utils/storage';
import { navigateToPayment } from '@/utils/navigation';

export function useOrderList() {
      // Stores
      const router = useRouter();
      const orderStore = useOrderStore();
      const authStore = useAuthStore();
      const toast = useToast();

      // State
      const loading = ref(false);
      const currentPage = ref(1);
      const pageSize = ref(10);
      const hasMoreOrders = ref(true);
      const activeTab = ref<number | undefined>(undefined); // undefined represents all orders

      // Observer for infinite scrolling
      const observer = ref<IntersectionObserver | null>(null);
      const loadingTriggerRef = ref<HTMLElement | null>(null);

      // Computed
      const orders = computed(() => orderStore.orders);

      // Methods
      /**
       * Fetch orders with pagination
       * @param reset Whether to reset the list or append to it
       */
      const fetchOrders = async (reset: boolean = false) => {
            if (!authStore.isLoggedIn) {
                  toast.warning('Please log in first');
                  router.push('/login');
                  return;
            }

            if (loading.value) return;

            try {
                  loading.value = true;

                  if (reset) {
                        // Clear current orders and reset pagination
                        orderStore.clearOrders();
                        currentPage.value = 1;
                  }

                  const response = await orderStore.getOrderList(
                        currentPage.value,
                        pageSize.value,
                        activeTab.value
                  );

                  // Update hasMoreOrders based on if we received a full page
                  hasMoreOrders.value = response?.data.length === pageSize.value;
            } catch (error: any) {
                  toast.error('Failed to load orders');
                  console.error('Error fetching orders:', error);
            } finally {
                  loading.value = false;
            }
      };

      /**
       * Load more orders when scrolling down
       */
      const loadMoreOrders = () => {
            if (loading.value || !hasMoreOrders.value) return;

            currentPage.value += 1;
            fetchOrders(false);
      };

      /**
       * Refresh order list completely
       */
      const refreshOrders = () => {
            // 先清空orders数组
            orderStore.clearOrders();

            // 关键修改：清除订单列表缓存
            storage.clearOrderCache();

            // 重置分页状态
            currentPage.value = 1;
            hasMoreOrders.value = true;

            // 重新获取数据
            fetchOrders(true);
      };

      /**
       * Cancel an order
       */
      const cancelOrder = async (orderId: string) => {
            try {
                  loading.value = true;
                  await orderStore.cancelOrder(orderId);
                  toast.success('Order cancelled');
                  refreshOrders();
            } catch (error: any) {
                  toast.error('Failed to cancel order');
                  console.error('Cancel order error:', error);
            } finally {
                  loading.value = false;
            }
      };

      /**
       * Pay for an order
       */
      const payOrder = (orderId: string) => { 
            // 使用导航工具函数来确保一致的导航行为
            navigateToPayment(router, orderId);
      };

      /**
       * Confirm receipt of an order
       */
      const confirmReceipt = async (orderId: string) => {
            if (!confirm('Are you sure you have received this order?')) return;

            try {
                  loading.value = true;
                  await orderStore.confirmReceipt(orderId);
                  toast.success('Receipt confirmed');
                  refreshOrders();
            } catch (error: any) {
                  toast.error('Failed to confirm receipt');
                  console.error('Confirm receipt error:', error);
            } finally {
                  loading.value = false;
            }
      };

      /**
       * Navigate to home page
       */
      const goToHome = () => {
            router.push('/home');
      };

      /**
       * Set up intersection observer for infinite scrolling
       */
      const setupInfiniteScroll = () => {
            observer.value = new IntersectionObserver(
                  (entries) => {
                        if (entries[0].isIntersecting && hasMoreOrders.value && !loading.value) {
                              loadMoreOrders();
                        }
                  },
                  { threshold: 0.5 }
            );

            if (loadingTriggerRef.value) {
                  observer.value.observe(loadingTriggerRef.value);
            }
      };

      /**
       * Set reference element for infinite scrolling
       */
      const setLoadingTriggerRef = (el: HTMLElement | null) => {
            loadingTriggerRef.value = el;
            if (el && observer.value) {
                  observer.value.observe(el);
            }
      };

      // Lifecycle hooks
      onMounted(async () => {
            // Check login status
            if (!authStore.isLoggedIn) {
                  toast.warning('Please log in first');
                  router.push({
                        path: '/login',
                        query: { redirect: router.currentRoute.value.fullPath }
                  });
                  return;
            }

            // Initialize order store if needed
            if (!orderStore.isInitialized()) {
                  await orderStore.init();
            }

            // Fetch initial orders
            await fetchOrders(true);

            // Set up infinite scrolling
            setupInfiniteScroll();
      });

      onUnmounted(() => {
            // Clean up observer
            if (observer.value && loadingTriggerRef.value) {
                  observer.value.unobserve(loadingTriggerRef.value);
                  observer.value.disconnect();
            }
      });

      return {
            // State
            loading,
            hasMoreOrders,
            activeTab,
            orders,

            // Methods
            fetchOrders,
            loadMoreOrders,
            refreshOrders,
            cancelOrder,
            payOrder,
            confirmReceipt,
            goToHome,
            setLoadingTriggerRef,
      };
}