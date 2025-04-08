<!-- src/components/order/OrderItem.vue -->
<template>
    <div class="bg-white rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer mb-4"
      @click="viewOrderDetail">
      <!-- Order Header: Order Number and Status -->
      <div class="flex justify-between items-center px-4 pt-4">
        <div class="text-sm">
          <span class="text-gray-500">Order No: </span>
          <span class="font-medium">{{ order.orderNo }}</span>
        </div>
        <div class="text-sm font-medium" :class="getStatusColor(order.orderStatus)">
          {{ getStatusText(order.orderStatus) }}
        </div>
      </div>
  
      <!-- Order Content -->
      <div class="p-4">
        <!-- Order Items List -->
        <div class="space-y-3">
          <div v-for="(item, index) in orderItems" :key="index" class="flex items-center">
            <div class="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 mr-3">
              <img :src="getItemImage(item)" alt="item.productName" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium line-clamp-1">{{ item.productName }}</div>
              <div class="text-xs text-gray-500 mt-1">
                {{ formatSkuSpecs(item.skuSpecs) }}
              </div>
              <div class="flex justify-between items-end mt-1">
                <div class="text-sm text-gray-900">{{ formatPrice(item.unitPrice) }}</div>
                <div class="text-xs text-gray-500">x{{ item.quantity }}</div>
              </div>
            </div>
          </div>
        </div>
  
        <!-- Order Total -->
        <div class="flex justify-between items-center mt-4 pt-2">
          <div class="text-sm text-gray-500">
            {{ orderItems.length }} items in total
          </div>
          <div class="text-sm">
            <span class="mr-1">Total: </span>
            <span class="font-bold text-red-500">{{ formatPrice(order.paymentAmount) }}</span>
          </div>
        </div>
  
        <!-- Order Actions -->
        <div class="flex justify-end mt-3 pt-3 space-x-2" v-if="order.orderStatus !== OrderStatus.CANCELLED">
          <!-- Pending Payment Status -->
          <template v-if="order.orderStatus === OrderStatus.PENDING_PAYMENT">
            <button @click.stop="cancelOrder"
              class="px-4 py-1.5 text-sm border border-gray-300 rounded-full">
              Cancel Order
            </button>
            <button @click.stop="payOrder"
              class="px-4 py-1.5 text-sm bg-red-500 text-white rounded-full">
              Pay Now
            </button>
          </template>
  
          <!-- Shipped Status -->
          <template v-else-if="order.orderStatus === OrderStatus.SHIPPED">
            <button @click.stop="confirmReceipt"
              class="px-4 py-1.5 text-sm bg-black text-white rounded-full">
              Confirm Receipt
            </button>
          </template>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { OrderStatus } from '@/types/common.type';
  import type { OrderBasic } from '@/types/order.type';
  
  // Props
  const props = defineProps<{
    order: OrderBasic;
    loading?: boolean;
  }>();
  
  // Emits
  const emit = defineEmits<{
    'cancel': [id: string];
    'pay': [id: string];
    'confirm-receipt': [id: string];
  }>();
  
  // Hooks
  const router = useRouter();
  
  // Computed properties
  const orderItems = computed(() => {
    // Access orderItems directly - backend now returns them with the order
    return (props.order as any).orderItems || [];
  });
  
  // Methods
  function getItemImage(item: any) {
    return item.sku?.image || item.mainImage;
  }
  
  function formatSkuSpecs(skuSpecs: any[]) {
    if (!skuSpecs || !Array.isArray(skuSpecs) || skuSpecs.length === 0) {
      return '';
    }
    return skuSpecs.map(spec => `${spec.specName}: ${spec.specValue}`).join(' / ');
  }
  
  function formatPrice(price: number) {
    return price.toLocaleString('mn-MN') + ' ₮';
  }
  
  function getStatusText(status: number | null): string {
    if (status === null) return 'Unknown Status';
  
    switch (status) {
      case OrderStatus.PENDING_PAYMENT: return 'Pending Payment';
      case OrderStatus.PENDING_SHIPMENT: return 'Pending Shipment';
      case OrderStatus.SHIPPED: return 'Shipped';
      case OrderStatus.COMPLETED: return 'Completed';
      case OrderStatus.CANCELLED: return 'Cancelled';
      default: return 'Unknown Status';
    }
  }
  
  function getStatusColor(status: number | null): string {
    if (status === null) return 'text-gray-500';
  
    switch (status) {
      case OrderStatus.PENDING_PAYMENT: return 'text-orange-500';
      case OrderStatus.PENDING_SHIPMENT: return 'text-blue-500';
      case OrderStatus.SHIPPED: return 'text-green-500';
      case OrderStatus.COMPLETED: return 'text-gray-800';
      case OrderStatus.CANCELLED: return 'text-gray-500';
      default: return 'text-gray-500';
    }
  }
  
  // Actions
  function viewOrderDetail() {
    router.push(`/order/${props.order.id}`);
  }
  
  function cancelOrder() {
    emit('cancel', props.order.id);
  }
  
  function payOrder() {
    emit('pay', props.order.id);
  }
  
  function confirmReceipt() {
    emit('confirm-receipt', props.order.id);
  }
  </script>