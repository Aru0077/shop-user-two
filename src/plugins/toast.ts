// src/plugins/toast.ts
import type { App } from 'vue';
import { toast } from '@/utils/toast.service';

export default {
      install: (app: App) => {
            // 添加全局属性
            app.config.globalProperties.$toast = toast;

            // 全局注入toast
            app.provide('toast', toast);
      }
};

// 声明全局属性类型
declare module '@vue/runtime-core' {
      interface ComponentCustomProperties {
            $toast: typeof toast;
      }
}