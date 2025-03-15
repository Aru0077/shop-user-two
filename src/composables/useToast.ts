// src/composables/useToast.ts
import { inject } from 'vue';
import { toast as toastService } from '@/utils/toast.service';

/**
 * Toast 组合式函数，用于在组件中便捷地使用 toast
 */
export function useToast() {
      // 尝试注入toast实例，如果未找到，使用直接导入的toast服务
      const injectedToast = inject('toast', toastService);
      return injectedToast;
}