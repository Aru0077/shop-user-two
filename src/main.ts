// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './index.css'
import App from './App.vue'
import router from './router'
import ToastPlugin from './plugins/toast'
import { EventBusPlugin } from '@/core/event-bus';
import { initializeApp } from '@/utils/app-initializer';

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

            // 挂载应用
            app.mount('#app');
      } catch (error) {
            console.error('应用初始化失败:', error);
      }
};

startApp();