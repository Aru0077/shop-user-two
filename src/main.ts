import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './index.css'
import App from './App.vue'
import router from './router'
import ToastPlugin from './plugins/toast'



// 创建Pinia实例
const pinia = createPinia()






// 创建Vue应用实例
const app = createApp(App)


app.use(pinia)   // 使用Pinia实例
app.use(router)  // 使用路由
app.use(ToastPlugin) // 使用Toast插件

// 挂载Vue实例
app.mount('#app')
