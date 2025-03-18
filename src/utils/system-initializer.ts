// src/utils/system-initializer.ts
import { eventBus, AppEvents, EventPriority } from '@/utils/event-bus'; 
import { toast } from '@/utils/toast.service';

/**
 * 系统事件初始化助手
 * 管理全局事件的注册与初始化
 */
class SystemInitializer {
    private static instance: SystemInitializer;
    private isInitialized: boolean = false;
    private readonly unsubscribers: Array<() => void> = [];
    
    private constructor() {}
    
    /**
     * 获取单例实例
     */
    public static getInstance(): SystemInitializer {
        if (!SystemInitializer.instance) {
            SystemInitializer.instance = new SystemInitializer();
        }
        return SystemInitializer.instance;
    }
    
    /**
     * 初始化系统事件
     */
    public initialize(): void {
        if (this.isInitialized) return;
        
        // 注册全局事件处理
        this.registerGlobalEventHandlers();
        
        // 注册认证相关事件处理
        this.registerAuthEventHandlers();
        
        // 注册应用生命周期事件处理
        this.registerAppLifecycleHandlers();
        
        // 注册网络错误处理
        this.registerNetworkErrorHandlers();
        
        this.isInitialized = true;
        console.log('系统事件初始化完成');
    }
    
    /**
     * 注册全局事件处理
     */
    private registerGlobalEventHandlers(): void {
        // 监听存储清理事件
        const storageCleanedUnsub = eventBus.on(AppEvents.STORAGE_CLEANED, () => {
            console.log('存储已清理');
            toast.info('应用缓存已清理');
        });
        
        this.unsubscribers.push(storageCleanedUnsub);
    }
    
    /**
     * 注册认证相关事件处理
     */
    private registerAuthEventHandlers(): void {
        // 会话过期事件 - 高优先级处理
        const sessionExpiredUnsub = eventBus.on(
            AppEvents.AUTH_SESSION_EXPIRED, 
            () => {
                toast.error('您的登录已过期，请重新登录');
                console.log('会话已过期，系统将自动登出');
                
                // 等待toast显示后再触发登出事件
                setTimeout(() => {
                    eventBus.emit(AppEvents.AUTH_LOGOUT);
                }, 1500);
            },
            { priority: EventPriority.HIGH }
        );
        
        // 登录事件处理
        const loginUnsub = eventBus.on(AppEvents.AUTH_LOGIN, (userId: string) => {
            console.log(`用户 ${userId} 已登录`);
            toast.success('登录成功');
        });
        
        // 登出事件处理
        const logoutUnsub = eventBus.on(AppEvents.AUTH_LOGOUT, () => {
            console.log('用户已登出');
            toast.info('您已安全退出登录');
        });
        
        this.unsubscribers.push(sessionExpiredUnsub, loginUnsub, logoutUnsub);
    }
    
    /**
     * 注册应用生命周期事件处理
     */
    private registerAppLifecycleHandlers(): void {
        // 应用初始化完成事件
        const appInitializedUnsub = eventBus.on(AppEvents.APP_INITIALIZED, () => {
            console.log('应用初始化完成');
        });
        
        this.unsubscribers.push(appInitializedUnsub);
    }
    
    /**
     * 注册网络错误处理
     */
    private registerNetworkErrorHandlers(): void {
        // 网络错误事件处理
        const networkErrorUnsub = eventBus.on(AppEvents.NETWORK_ERROR, (error: any) => {
            console.error('网络错误:', error);
            
            // 根据错误状态码区分处理
            if (error && error.status === 401) {
                // 未授权，触发会话过期事件
                eventBus.emit(AppEvents.AUTH_SESSION_EXPIRED);
            } else if (error && error.status >= 500) {
                // 服务器错误
                toast.error('服务器暂时不可用，请稍后再试');
            } else {
                // 其他网络错误
                toast.error('网络连接异常，请检查您的网络设置');
            }
        });
        
        this.unsubscribers.push(networkErrorUnsub);
    }
    
    /**
     * 清理所有事件订阅
     */
    public dispose(): void {
        // 取消所有事件订阅
        this.unsubscribers.forEach(unsubscribe => unsubscribe());
        this.unsubscribers.length = 0;
        this.isInitialized = false;
    }
}

// 导出单例实例
export const systemInitializer = SystemInitializer.getInstance();

// 默认导出
export default systemInitializer;