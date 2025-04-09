// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './index.css'
import App from './App.vue'
import router from './router'
import ToastPlugin from './plugins/toast'
import { EventBusPlugin } from '@/core/event-bus';
import { initializeApp } from '@/utils/app-initializer';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(ToastPlugin);
app.use(EventBusPlugin);

// 初始化应用
const startApp = async () => {
      try {
            // 初始化整个应用
            await initializeApp();

            // 获取认证store并初始化
            const authStore = useAuthStore();
            await authStore.init();

            // 设置路由到认证服务
            authService.setRouter(router);

            // 挂载应用
            app.mount('#app');
      } catch (error) {
            console.error('应用初始化失败:', error);
      }
};

startApp();