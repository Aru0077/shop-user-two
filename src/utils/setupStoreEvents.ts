// src/utils/setupStoreEvents.ts
import { eventBus } from '@/utils/eventBus';
import { useUserStore } from '@/stores/user.store';
import { useCartStore } from '@/stores/cart.store';
import { useFavoriteStore } from '@/stores/favorite.store';
import { useAddressStore } from '@/stores/address.store';
import { useOrderStore } from '@/stores/order.store';
import { useCheckoutStore } from '@/stores/checkout.store';
import { toast } from '@/utils/toast.service';

/**
 * 设置全局事件监听器，协调各 store 之间的通信
 */
export function setupStoreEvents() {
      const userStore = useUserStore();
      const cartStore = useCartStore();
      const favoriteStore = useFavoriteStore();
      const addressStore = useAddressStore();
      const orderStore = useOrderStore();
      const checkoutStore = useCheckoutStore();

      // 监听用户事件
      eventBus.on('user:login', async ({ userId }) => {
            console.log(`[Store Events] 用户 ${userId} 登录成功`);

            // 登录后初始化各个模块
            if (!cartStore.isInitialized) cartStore.initCart();
            if (!favoriteStore.isInitialized) favoriteStore.init();
            if (!addressStore.isInitialized) addressStore.init();
            if (!orderStore.isInitialized) orderStore.init();

            // 可以在这里显示欢迎提示
            toast.success('登录成功，欢迎回来！');
      });

      eventBus.on('user:logout', () => {
            console.log('[Store Events] 用户登出');

            // 清除各模块的用户相关数据
            cartStore.clearCart?.();
            favoriteStore.clearFavoriteCache?.();
            addressStore.clearAddressCache?.();
            orderStore.clearAllOrderCache?.();
            checkoutStore.clearCheckoutCache?.();

            // 提示用户
            toast.info('您已安全退出登录');
      });

      // 监听购物车事件
      eventBus.on('cart:item-added', ({ productId, quantity }) => {
            console.log(`[Store Events] 商品 ${productId} 已添加到购物车`);
            toast.success(`商品已添加到购物车 (${quantity}件)`);
      });

      eventBus.on('cart:item-removed', () => {
            toast.info('商品已从购物车中移除');
      });

      // 监听订单事件
      eventBus.on('order:created', ({ orderId }) => {
            console.log(`[Store Events] 订单 ${orderId} 已创建`);

            // 创建订单后清空购物车
            cartStore.clearCart?.();

            // 刷新订单列表
            orderStore.fetchOrders?.(1, 10, undefined, true);

            toast.success('订单创建成功！');
      });

      eventBus.on('order:paid', ({ orderId }) => {
            console.log(`[Store Events] 订单 ${orderId} 已支付`);

            // 刷新订单状态
            orderStore.fetchOrderDetail?.(orderId, true);

            toast.success('支付成功，感谢您的购买！');
      });

      // 监听错误事件
      eventBus.on('app:error', ({ code, message }) => {
            console.error(`[Store Events] 错误 (${code}): ${message}`);

            // 对特定错误码进行特殊处理
            if (code === 1001) {
                  toast.error('初始化失败，请刷新页面重试');
            } else if (code >= 2000 && code < 3000) {
                  toast.error(`购物车操作失败: ${message}`);
            } else {
                  toast.error(message);
            }
      });

      // 监听网络状态事件
      eventBus.on('app:network-status', ({ online }) => {
            if (online) {
                  toast.info('网络已恢复');

                  // 网络恢复后可以刷新关键数据
                  if (userStore.isLoggedIn) {
                        cartStore.refreshCartIfNeeded?.(true);
                  }
            } else {
                  toast.warning('网络连接已断开，部分功能可能不可用');
            }
      });

      // 其他事件监听...

      // 注册网络状态检测
      window.addEventListener('online', () => eventBus.emit('app:network-status', { online: true }));
      window.addEventListener('offline', () => eventBus.emit('app:network-status', { online: false }));

      console.log('[Store Events] 全局事件系统已初始化');
}