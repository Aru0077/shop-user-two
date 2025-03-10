import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './index.css'
import App from './App.vue'

// 创建Pinia实例
const pinia = createPinia()






// 创建Vue应用实例
const app = createApp(App)

// 使用Pinia实例
app.use(pinia)

// 挂载Vue实例
app.mount('#app')
