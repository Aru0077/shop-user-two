<!-- src/views/order/OrderListPage.vue -->
<template>
    <div class="p-4 flex flex-col h-full overflow-hidden">
      <!-- Page Title -->
      <div class="flex justify-between items-center mb-4 flex-shrink-0">
        <PageTitle mainTitle="My Orders" />
        <div @click="refreshOrders" class="text-sm font-medium cursor-pointer flex items-center">
          <RefreshCw :size="16" class="mr-1" :class="{ 'animate-spin': loading }" />
          Refresh
        </div>
      </div>
  
      <div class="flex-1 overflow-y-auto min-h-0 ">
        <!-- Loading State -->
        <div v-if="loading && orders.length === 0" class="flex justify-center items-center h-40">
          <div
            class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-r-transparent align-middle">
          </div>
        </div>
  
        <!-- Empty Order State -->
        <div v-else-if="orders.length === 0" class="flex flex-col items-center justify-center py-16">
          <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ShoppingBag :size="36" class="text-gray-400" />
          </div>
          <div class="text-gray-500 mb-6">No Orders</div>
          <button @click="goToHome" class="bg-black text-white py-3 px-8 rounded-full flex items-center">
            <ShoppingBag :size="16" class="mr-2" />
            Shop Now
          </button>
        </div>
  
        <!-- Order List -->
        <div v-else class="space-y-4">
          <OrderItem 
            v-for="order in orders" 
            :key="order.id" 
            :order="order"
            :loading="loading"
            @cancel="cancelOrder"
            @pay="payOrder"
            @confirm-receipt="confirmReceipt"
          />
        </div>
  
        <!-- Infinite Scroll Trigger -->
        <div 
          v-if="orders.length > 0" 
          ref="loadingTrigger" 
          class="h-10 flex justify-center items-center mt-4">
          <div v-if="loading" class="flex items-center">
            <div class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-gray-500 border-r-transparent mr-2 align-middle"></div>
            <span class="text-sm text-gray-500">Loading...</span>
          </div>
          <div v-else-if="!hasMoreOrders" class="text-center text-sm text-gray-500">
            All orders have been displayed
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { ShoppingBag, RefreshCw } from 'lucide-vue-next';
  import PageTitle from '@/components/common/PageTitle.vue';
  import OrderItem from '@/components/order/OrderItem.vue';
  import { useOrderList } from '@/composables/useOrderList';
  
  // Use the order list composable
  const { 
    loading, 
    hasMoreOrders, 
    orders, 
    refreshOrders, 
    loadMoreOrders,
    cancelOrder, 
    payOrder, 
    confirmReceipt, 
    goToHome
  } = useOrderList();
  
  // Ref for intersection observer
  const loadingTrigger = ref<HTMLElement | null>(null);
  
  // Set up the observer when the component is mounted
  onMounted(() => {
    // Create an observer for infinite scrolling
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreOrders.value && !loading.value) {
          // Trigger loading more orders from the composable
          // This is implemented in the useOrderList composable
          fetchMoreOrders();
        }
      },
      { threshold: 0.5 }
    );
    
    // Start observing the loading trigger element
    if (loadingTrigger.value) {
      observer.observe(loadingTrigger.value);
    }
  
    // Clean up the observer when the component is unmounted
    return () => {
      if (loadingTrigger.value) {
        observer.disconnect();
      }
    };
  });
  
  // Function to fetch more orders when triggered by intersection observer
  function fetchMoreOrders() {
    loadMoreOrders();
  }
  </script>