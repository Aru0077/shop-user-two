// src/utils/event-bus.ts

// 事件处理函数类型定义
type EventHandler = (...args: any[]) => void;

// 保留核心事件常量，大幅减少原有事件类型
export const AppEvents = {
      // 用户认证相关
      LOGIN: 'auth:login',
      LOGOUT: 'auth:logout',

      // 应用状态相关
      APP_READY: 'app:ready',
      NETWORK_ERROR: 'app:network-error',

      // 数据相关
      CART_UPDATED: 'data:cart-updated',
      USER_UPDATED: 'data:user-updated',
      PRODUCT_UPDATED: 'data:product-updated',

      // 用户交互
      UI_ERROR: 'ui:error',
      UI_SUCCESS: 'ui:success'
};

/**
 * 极简版事件总线
 * 移除了复杂的优先级系统和多余的功能
 */
class EventBus {
      private events: Map<string, Set<EventHandler>> = new Map();
      private static instance: EventBus;

      // 单例模式
      private constructor() {
            this.events = new Map();
      }

      /**
       * 获取事件总线实例
       */
      public static getInstance(): EventBus {
            if (!EventBus.instance) {
                  EventBus.instance = new EventBus();
            }
            return EventBus.instance;
      }

      /**
       * 订阅事件
       * @param eventName 事件名称
       * @param handler 事件处理函数
       * @returns 用于取消订阅的函数
       */
      public on(eventName: string, handler: EventHandler): () => void {
            if (!this.events.has(eventName)) {
                  this.events.set(eventName, new Set());
            }

            this.events.get(eventName)!.add(handler);

            // 返回取消订阅函数
            return () => this.off(eventName, handler);
      }

      /**
       * 一次性订阅事件（触发后自动取消订阅）
       * @param eventName 事件名称
       * @param handler 事件处理函数
       * @returns 用于取消订阅的函数
       */
      public once(eventName: string, handler: EventHandler): () => void {
            // 创建一个包装函数，在触发后自动取消订阅
            const wrappedHandler: EventHandler = (...args: any[]) => {
                  handler(...args);
                  this.off(eventName, wrappedHandler);
            };

            return this.on(eventName, wrappedHandler);
      }

      /**
       * 取消事件订阅
       * @param eventName 事件名称
       * @param handler 要移除的事件处理函数
       */
      public off(eventName: string, handler: EventHandler): void {
            if (!this.events.has(eventName)) return;

            const handlers = this.events.get(eventName)!;
            handlers.delete(handler);

            // 如果事件没有处理器了，删除这个事件
            if (handlers.size === 0) {
                  this.events.delete(eventName);
            }
      }

      /**
       * 触发事件
       * @param eventName 事件名称
       * @param args 事件参数
       */
      public emit(eventName: string, ...args: any[]): void {
            if (!this.events.has(eventName)) return;

            // 复制处理器集合以避免在迭代过程中集合被修改导致的问题
            const handlers = Array.from(this.events.get(eventName)!);

            for (const handler of handlers) {
                  try {
                        handler(...args);
                  } catch (error) {
                        console.error(`事件处理器执行出错 [${eventName}]:`, error);
                  }
            }
      }

      /**
       * 清除特定事件的所有处理器
       * @param eventName 事件名称（可选，不传则清除所有事件）
       */
      public clear(eventName?: string): void {
            if (eventName) {
                  this.events.delete(eventName);
            } else {
                  this.events.clear();
            }
      }
}

// 导出事件总线实例
export const eventBus = EventBus.getInstance();

// 默认导出
export default eventBus;