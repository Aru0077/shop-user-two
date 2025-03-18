// src/services/index.ts
import { ref } from 'vue';
import { authService } from './auth.service';
import { addressService } from './address.service';
import { cartService } from './cart.service';
import { favoriteService } from './favorite.service';
import { checkoutService } from './checkout.service';
import { tempOrderService } from './temp-order.service';
import { orderService } from './order.service'; 
import { productService } from './product.service';
import { promotionService } from './promotion.service';
import { eventBus } from '@/utils/event-bus';
import { toast } from '@/utils/toast.service';

// 初始化状态 - 保留简单的状态追踪
const isInitialized = ref(false);
const isInitializing = ref(false);

/**
 * 简化的服务初始化函数
 * 负责初始化各个服务实例，但不处理它们之间的依赖关系
 * 依赖关系现在通过事件总线管理
 */
export async function initializeServices(): Promise<boolean> {
    // 避免重复初始化
    if (isInitialized.value || isInitializing.value) {
        return isInitialized.value;
    }

    isInitializing.value = true;
    console.log('开始初始化服务...');

    try {
        // 第一阶段：初始化认证服务（仍然需要首先初始化）
        const authInitialized = authService.init();

        // 如果认证服务初始化失败，发出错误事件并中断初始化流程
        if (!authInitialized) {
            console.error('认证服务初始化失败，中断初始化');
            eventBus.emit('app:initialization-error', {
                phase: 'auth-service',
                error: new Error('认证服务初始化失败')
            });
            return false;
        }

        // 第二阶段：并行初始化所有基础服务（不需要关心登录状态的服务）
        // 顺序不再那么重要，因为依赖关系通过事件总线管理
        const baseServicesPromises = [
            productService.init({ loadHomeDataOnly: true }),
            promotionService.init()
        ];

        // 等待基础服务初始化
        const baseResults = await Promise.allSettled(baseServicesPromises);
        
        // 检查是否有基础服务初始化失败
        const failedBaseServices = baseResults.filter(result => result.status === 'rejected');
        if (failedBaseServices.length > 0) {
            console.warn(`${failedBaseServices.length}个基础服务初始化失败，但应用将继续运行`);
            // 发出警告事件
            eventBus.emit('app:initialization-warning', {
                phase: 'base-services',
                failedCount: failedBaseServices.length
            });
        }

        // 第三阶段：初始化可能依赖用户登录状态的服务
        // 这些服务将在其内部确定是否需要进一步初始化
        const userServicesPromises = [
            cartService.init(),
            addressService.init(),
            favoriteService.init(),
            checkoutService.init(),
            tempOrderService.init(),
            orderService.init()
        ];

        // 等待用户相关服务初始化
        const userResults = await Promise.allSettled(userServicesPromises);
        
        // 检查是否有用户服务初始化失败
        const failedUserServices = userResults.filter(result => result.status === 'rejected');
        if (failedUserServices.length > 0) {
            console.warn(`${failedUserServices.length}个用户服务初始化失败，但应用将继续运行`);
            // 发出警告事件
            eventBus.emit('app:initialization-warning', {
                phase: 'user-services',
                failedCount: failedUserServices.length
            });
        }

        isInitialized.value = true;
        console.log('服务初始化完成');
        
        // 发出服务初始化完成事件
        eventBus.emit('app:services-initialized');

        return true;
    } catch (error) {
        console.error('服务初始化过程中发生错误:', error);
        toast.error('应用初始化失败，请刷新页面重试');
        
        // 发出错误事件
        eventBus.emit('app:initialization-error', {
            phase: 'services',
            error
        });
        
        return false;
    } finally {
        isInitializing.value = false;
    }
}

// 导出所有服务单例 - 这部分仍然需要保留
export {
    authService,
    addressService,
    cartService,
    favoriteService,
    checkoutService,
    tempOrderService,
    orderService,
    productService,
    promotionService
};