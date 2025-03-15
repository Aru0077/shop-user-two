// src/utils/toast.service.ts
import { reactive, createApp, h } from 'vue';
import Toast from '@/components/ui/Toast.vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom';

interface ToastOptions {
      message: string;
      type: ToastType;
      duration?: number;
      position?: ToastPosition;
}

interface ToastInstance extends ToastOptions {
      id: number;
      el: HTMLElement;
}

const toasts = reactive<ToastInstance[]>([]);
let toastId = 0;

/**
 * 创建一个新的Toast实例
 */
const createToast = (options: ToastOptions): number => {
      const id = toastId++;

      // 创建挂载点
      const el = document.createElement('div');
      document.body.appendChild(el);

      // 创建Toast应用实例
      const app = createApp({
            render() {
                  return h(Toast, {
                        message: options.message,
                        type: options.type,
                        duration: options.duration,
                        position: options.position || 'top',
                        onClose: () => removeToast(id)
                  });
            }
      });

      // 挂载应用
      app.mount(el);

      // 保存Toast实例
      const instance: ToastInstance = {
            id,
            el,
            ...options
      };

      toasts.push(instance);
      return id;
};

/**
 * 移除指定id的Toast
 */
const removeToast = (id: number) => {
      const index = toasts.findIndex(toast => toast.id === id);
      if (index !== -1) {
            const { el } = toasts[index];
            // 先卸载应用
            if ((el as any)._vueApp) {
                  (el as any)._vueApp.unmount();
            }
            // 移除DOM元素
            document.body.removeChild(el);
            // 从数组中移除
            toasts.splice(index, 1);
      }
};

/**
 * 移除所有Toast
 */
const clearAll = () => {
      toasts.forEach(toast => {
            const el = toast.el as any;
            if (el._vueApp) {
                  el._vueApp.unmount();
            }
            document.body.removeChild(toast.el);
      });
      toasts.length = 0;
};

/**
 * Toast服务
 */
export const toast = {
      /**
       * 显示成功提示
       */
      success(message: string, options: Partial<Omit<ToastOptions, 'message' | 'type'>> = {}) {
            return createToast({
                  message,
                  type: 'success',
                  ...options
            });
      },

      /**
       * 显示错误提示
       */
      error(message: string, options: Partial<Omit<ToastOptions, 'message' | 'type'>> = {}) {
            return createToast({
                  message,
                  type: 'error',
                  ...options
            });
      },

      /**
       * 显示警告提示
       */
      warning(message: string, options: Partial<Omit<ToastOptions, 'message' | 'type'>> = {}) {
            return createToast({
                  message,
                  type: 'warning',
                  ...options
            });
      },

      /**
       * 显示信息提示
       */
      info(message: string, options: Partial<Omit<ToastOptions, 'message' | 'type'>> = {}) {
            return createToast({
                  message,
                  type: 'info',
                  ...options
            });
      },

      /**
       * 关闭指定id的Toast
       */
      close(id: number) {
            removeToast(id);
      },

      /**
       * 关闭所有Toast
       */
      clearAll
};

export default toast;