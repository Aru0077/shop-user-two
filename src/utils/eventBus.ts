// src/utils/eventBus.ts
import mitt from 'mitt';

// 定义事件类型
export type EventPayloads = {
      // 用户相关事件
      'user:login': { userId: string };
      'user:logout': undefined;
      'user:initialized': boolean;

      // 购物车相关事件
      'cart:updated': { itemCount: number };
      'cart:initialized': boolean;
      'cart:item-added': { productId: number, skuId: number, quantity: number };
      'cart:item-removed': { id: number };
      'cart:cleared': undefined;

      // 收藏相关事件
      'favorite:added': { productId: number };
      'favorite:removed': { productId: number };
      'favorite:initialized': boolean;

      // 地址相关事件
      'address:updated': undefined;
      'address:initialized': boolean;

      // 订单相关事件
      'order:created': { orderId: string };
      'order:paid': { orderId: string };
      'order:canceled': { orderId: string };
      'order:confirmed': { orderId: string };
      'order:initialized': boolean;

      // 结算相关事件
      'checkout:updated': undefined;
      'checkout:initialized': boolean;

      // 应用状态事件
      'app:initializing': undefined;
      'app:initialized': undefined;
      'app:network-status': { online: boolean };
      'app:error': { code: number; message: string };
}

// 创建事件总线实例
export const eventBus = mitt<EventPayloads>();

// 调试辅助函数（开发环境使用）
if (import.meta.env.DEV) {
      eventBus.on('*', (type, payload) => {
            console.log(`[EventBus] ${String(type)}`, payload);
      });
}

export default eventBus;