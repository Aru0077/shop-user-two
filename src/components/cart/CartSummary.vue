<!-- src/components/cart/CartSummary.vue -->
<template>
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-md z-10 safe-area-bottom">
      <div class="p-3">
        <div class="flex items-center mb-3">
          <!-- 全选 -->
          <div class="flex items-center">
            <input type="checkbox" :checked="isAllSelected" @change="emit('toggle-select-all')"
              class="w-5 h-5 accent-black mr-2" />
            <span class="text-sm">全选</span>
          </div>
  
          <!-- 合计信息 -->
          <div class="flex-1 text-right">
            <div class="flex items-center justify-end">
              <div class="text-sm mr-1">总计:</div>
              <div class="text-red-500 font-bold text-lg">{{ formatPrice(totalAmount) }}</div>
            </div>
            <div class="text-xs text-gray-500">已选 {{ selectedCount }} 件商品</div>
          </div>
        </div>
  
        <!-- 结算/删除按钮 -->
        <div>
          <button v-if="isEditMode" @click="emit('batch-remove')"
            class="w-full py-3 bg-red-500 text-white rounded-lg flex items-center justify-center"
            :disabled="selectedCount === 0" :class="{ 'opacity-50': selectedCount === 0 }">
            <Trash2 :size="16" class="mr-1" />
            删除所选 ({{ selectedCount }})
          </button>
          <button v-else @click="emit('checkout')"
            class="w-full py-3 bg-black text-white rounded-lg flex items-center justify-center"
            :disabled="selectedCount === 0" :class="{ 'opacity-50': selectedCount === 0 }">
            结算 ({{ selectedCount }})
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { Trash2 } from 'lucide-vue-next';
  
  defineProps({
    isAllSelected: {
      type: Boolean,
      required: true
    },
    selectedCount: {
      type: Number,
      required: true
    },
    totalAmount: {
      type: Number,
      required: true
    },
    isEditMode: {
      type: Boolean,
      default: false
    }
  });
  
  const emit = defineEmits<{
    'toggle-select-all': [];
    'checkout': [];
    'batch-remove': [];
  }>();
  
  // 格式化价格
  const formatPrice = (price: number): string => {
    return price.toLocaleString('mn-MN') + ' ₮';
  };
  </script>