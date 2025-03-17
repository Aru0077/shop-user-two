import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './index.css'
import App from './App.vue'
import router from './router'
import { setupStoreEvents } from '@/utils/setupStoreEvents';
import { useUserStore } from '@/stores/user.store';
import ToastPlugin from './plugins/toast'

// 创建Pinia实例
const pinia = createPinia()

// 创建Vue应用实例
const app = createApp(App)


app.use(pinia)   // 使用Pinia实例
app.use(router)  // 使用路由
app.use(ToastPlugin) // 使用Toast插件

// 设置全局事件监听
setupStoreEvents();

// 初始化用户状态
const userStore = useUserStore();
userStore.init();


// 挂载Vue实例
app.mount('#app')
