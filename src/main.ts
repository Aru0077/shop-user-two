// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './index.css'
import App from './App.vue'
import router from './router'
import ToastPlugin from './plugins/toast'
import { EventBusPlugin } from '@/core/event-bus';
import { serviceInitializer } from '@/core/service.init';

// 创建Vue应用实例
const app = createApp(App);

// 创建Pinia实例
const pinia = createPinia();

// 使用必要的插件
app.use(pinia);
app.use(router);
app.use(ToastPlugin);
// 使用事件总线插件
app.use(EventBusPlugin);

// 初始化应用
const initApp = async () => {
      try {
            // 初始化所有服务
            await serviceInitializer.initialize();

            // 挂载应用
            app.mount('#app');
      } catch (error) {
            console.error('应用初始化失败:', error);
      }
};

// 启动应用
initApp();