// src/utils/event-bus.ts

/**
 * 事件总线类型定义
 */

// 事件处理函数类型
export type EventHandler = (...args: any[]) => void;

// 事件优先级
export enum EventPriority {
      HIGH = 0,
      NORMAL = 1,
      LOW = 2,
}

// 事件处理器对象
interface EventSubscription {
      handler: EventHandler;
      priority: EventPriority;
      once: boolean;
}

/**
 * 应用中的标准事件名称
 * 使用命名空间风格命名以避免冲突
 */
export enum AppEvents {
      // 认证相关事件
      AUTH_LOGIN = 'auth:login',
      AUTH_LOGOUT = 'auth:logout',
      AUTH_SESSION_EXPIRED = 'auth:session-expired',
      AUTH_STATE_CHANGED = 'auth:state-changed',

      // 地址相关事件
      ADDRESS_ADDED = 'address:added',
      ADDRESS_UPDATED = 'address:updated',
      ADDRESS_DELETED = 'address:deleted',
      ADDRESS_SET_DEFAULT = 'address:set-default',
      ADDRESS_LIST_CHANGED = 'address:list-changed',

      // 购物车相关事件
      CART_ITEM_ADDED = 'cart:item-added',
      CART_ITEM_UPDATED = 'cart:item-updated',
      CART_ITEM_REMOVED = 'cart:item-removed',
      CART_CLEARED = 'cart:cleared',
      CART_CHANGED = 'cart:changed',

      // 收藏相关事件
      FAVORITE_ADDED = 'favorite:added',
      FAVORITE_REMOVED = 'favorite:removed',
      FAVORITE_LIST_CHANGED = 'favorite:list-changed',

      // 订单相关事件
      ORDER_CREATED = 'order:created',
      ORDER_PAID = 'order:paid',
      ORDER_SHIPPED = 'order:shipped',
      ORDER_DELIVERED = 'order:delivered',
      ORDER_CANCELED = 'order:canceled',
      ORDER_REFUNDED = 'order:refunded',

      // 产品相关事件
      PRODUCT_VIEWED = 'product:viewed',

      // 结算相关事件
      CHECKOUT_STARTED = 'checkout:started',
      CHECKOUT_COMPLETED = 'checkout:completed',

      // 全局应用事件
      APP_INITIALIZED = 'app:initialized',
      NETWORK_ERROR = 'app:network-error',
      STORAGE_CLEANED = 'app:storage-cleaned',

      // 用户界面事件
      UI_MODAL_OPENED = 'ui:modal-opened',
      UI_MODAL_CLOSED = 'ui:modal-closed',
      UI_DARK_MODE_CHANGED = 'ui:dark-mode-changed',
}

/**
 * 事件总线类 - 单例模式
 * 用于服务间通信
 */
class EventBus {
      private events: Map<string, EventSubscription[]> = new Map();
      private static instance: EventBus;

      // 私有构造函数，确保单例模式
      private constructor() {
            // 初始化事件映射
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
       * @param options 配置选项
       * @returns 取消订阅的函数
       */
      public on(
            eventName: string,
            handler: EventHandler,
            options: { priority?: EventPriority; once?: boolean } = {}
      ): () => void {
            const { priority = EventPriority.NORMAL, once = false } = options;

            // 如果这个事件名还没有处理器列表，则创建一个
            if (!this.events.has(eventName)) {
                  this.events.set(eventName, []);
            }

            const eventHandlers = this.events.get(eventName)!;
            const subscription: EventSubscription = { handler, priority, once };

            // 按优先级插入处理器
            let insertIndex = eventHandlers.findIndex(h => h.priority > priority);
            if (insertIndex === -1) insertIndex = eventHandlers.length;

            eventHandlers.splice(insertIndex, 0, subscription);

            // 返回取消订阅的函数
            return () => this.off(eventName, handler);
      }

      /**
       * 只订阅一次事件
       * @param eventName 事件名称
       * @param handler 事件处理函数
       * @param priority 事件优先级
       * @returns 取消订阅的函数
       */
      public once(
            eventName: string,
            handler: EventHandler,
            priority: EventPriority = EventPriority.NORMAL
      ): () => void {
            return this.on(eventName, handler, { priority, once: true });
      }

      /**
       * 取消事件订阅
       * @param eventName 事件名称
       * @param handler 要移除的事件处理函数
       */
      public off(eventName: string, handler: EventHandler): void {
            if (!this.events.has(eventName)) return;

            const eventHandlers = this.events.get(eventName)!;
            const index = eventHandlers.findIndex(subscription => subscription.handler === handler);

            if (index !== -1) {
                  eventHandlers.splice(index, 1);

                  // 如果事件没有处理器了，移除这个事件
                  if (eventHandlers.length === 0) {
                        this.events.delete(eventName);
                  }
            }
      }

      /**
       * 触发事件
       * @param eventName 事件名称
       * @param args 事件参数
       */
      public emit(eventName: string, ...args: any[]): void {
            if (!this.events.has(eventName)) return;

            const eventHandlers = this.events.get(eventName)!;
            const onceHandlers: EventHandler[] = [];

            // 执行所有的事件处理器
            for (const subscription of eventHandlers) {
                  subscription.handler(...args);

                  // 收集需要移除的一次性处理器
                  if (subscription.once) {
                        onceHandlers.push(subscription.handler);
                  }
            }

            // 移除一次性处理器
            for (const handler of onceHandlers) {
                  this.off(eventName, handler);
            }
      }

      /**
       * 清除特定事件的所有处理器
       * @param eventName 事件名称
       */
      public clear(eventName?: string): void {
            if (eventName) {
                  this.events.delete(eventName);
            } else {
                  this.events.clear();
            }
      }

      /**
       * 获取事件的所有处理器数量
       * @param eventName 事件名称
       */
      public listenerCount(eventName: string): number {
            return this.events.has(eventName) ? this.events.get(eventName)!.length : 0;
      }

      /**
       * 获取所有已注册的事件名称
       */
      public eventNames(): string[] {
            return Array.from(this.events.keys());
      }
}

// 导出事件总线单例
export const eventBus = EventBus.getInstance();

// 默认导出事件总线
export default eventBus;