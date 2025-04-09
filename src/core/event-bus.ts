// src/core/event-bus.ts
import type { App } from 'vue';

/**
 * 事件回调类型定义
 */
type EventCallback<T = any> = (payload: T) => void;

/**
 * 事件订阅选项
 */
interface EventSubscriptionOptions {
      /**
       * 防抖延迟时间(毫秒)，设置后会对事件触发进行防抖处理
       */
      debounceTime?: number;

      /**
       * 节流时间间隔(毫秒)，设置后会对事件触发进行节流处理
       */
      throttleTime?: number;

      /**
       * 标识符，用于区分同一事件的不同订阅者
       */
      identifier?: string;

      /**
       * 优先级，数字越小优先级越高，默认为0
       */
      priority?: number;
}

/**
 * 事件处理器
 */
interface EventHandler<T = any> {
      callback: EventCallback<T>;
      options: EventSubscriptionOptions;
      debounceTimer?: number | null;
      throttleLastTime?: number;
}

/**
 * 事件处理器集合
 */
interface EventHandlers {
      [eventName: string]: EventHandler[];
}

/**
 * 获取当前时间戳(毫秒)
 */
function now(): number {
      return Date.now();
}

/**
 * 事件总线类
 * 提供发布/订阅机制，用于服务之间的通信
 * 支持防抖、节流、命名空间和优先级
 */
class EventBus {
      private handlers: EventHandlers = {};
      private namespaces: Map<string, Set<string>> = new Map();

      /**
       * 解析事件名称和命名空间
       * 事件名称格式：namespace:eventName
       */
      private parseEventName(fullEventName: string): { namespace: string | null; eventName: string } {
            const parts = fullEventName.split(':');
            if (parts.length > 1) {
                  return {
                        namespace: parts[0],
                        eventName: parts.slice(1).join(':')
                  };
            }
            return {
                  namespace: null,
                  eventName: fullEventName
            };
      }

      /**
       * 注册事件到命名空间
       */
      private registerNamespace(namespace: string, eventName: string): void {
            if (!this.namespaces.has(namespace)) {
                  this.namespaces.set(namespace, new Set());
            }
            this.namespaces.get(namespace)?.add(eventName);
      }

      /**
       * 订阅事件
       * @param eventName 事件名称
       * @param callback 回调函数
       * @param options 订阅选项
       * @returns 取消订阅的函数
       */
      on<T = any>(
            eventName: string,
            callback: EventCallback<T>,
            options: EventSubscriptionOptions = {}
      ): () => void {
            const { namespace, eventName: event } = this.parseEventName(eventName);

            // 如果有命名空间，进行注册
            if (namespace) {
                  this.registerNamespace(namespace, event);
            }

            if (!this.handlers[eventName]) {
                  this.handlers[eventName] = [];
            }

            // 创建事件处理器
            const handler: EventHandler = {
                  callback: callback as EventCallback,
                  options: {
                        debounceTime: options.debounceTime,
                        throttleTime: options.throttleTime,
                        identifier: options.identifier || '',
                        priority: options.priority || 0
                  }
            };

            // 如果已经存在相同标识符的处理器，则替换它
            if (options.identifier) {
                  const existingIndex = this.handlers[eventName].findIndex(
                        h => h.options.identifier === options.identifier
                  );

                  if (existingIndex !== -1) {
                        // 清除可能存在的debounce计时器
                        const existing = this.handlers[eventName][existingIndex];
                        if (existing.debounceTimer) {
                              window.clearTimeout(existing.debounceTimer);
                        }
                        // 替换现有处理器
                        this.handlers[eventName][existingIndex] = handler;
                  } else {
                        // 添加新处理器并按优先级排序
                        this.handlers[eventName].push(handler);
                        this.handlers[eventName].sort((a, b) =>
                              (a.options.priority || 0) - (b.options.priority || 0)
                        );
                  }
            } else {
                  // 添加新处理器并按优先级排序
                  this.handlers[eventName].push(handler);
                  this.handlers[eventName].sort((a, b) =>
                        (a.options.priority || 0) - (b.options.priority || 0)
                  );
            }

            // 返回取消订阅的函数
            return () => {
                  this.off(eventName, callback);
            };
      }

      /**
       * 取消订阅事件
       * @param eventName 事件名称
       * @param callback 回调函数或标识符
       */
      off<T = any>(eventName: string, callbackOrIdentifier?: EventCallback<T> | string): void {
            if (!this.handlers[eventName]) return;

            if (!callbackOrIdentifier) {
                  // 如果没有提供回调，则删除该事件的所有订阅
                  delete this.handlers[eventName];
            } else if (typeof callbackOrIdentifier === 'string') {
                  // 如果提供的是标识符，则删除匹配标识符的订阅
                  const identifier = callbackOrIdentifier;
                  this.handlers[eventName] = this.handlers[eventName].filter(handler => {
                        if (handler.options.identifier === identifier) {
                              // 清除防抖计时器
                              if (handler.debounceTimer) {
                                    window.clearTimeout(handler.debounceTimer);
                              }
                              return false;
                        }
                        return true;
                  });
            } else {
                  // 删除特定的回调
                  this.handlers[eventName] = this.handlers[eventName].filter(handler => {
                        if (handler.callback !== callbackOrIdentifier) {
                              return true;
                        }
                        // 清除防抖计时器
                        if (handler.debounceTimer) {
                              window.clearTimeout(handler.debounceTimer);
                        }
                        return false;
                  });
            }
      }

      /**
       * 发布事件
       * @param eventName 事件名称
       * @param payload 事件数据
       */
      emit<T = any>(eventName: string, payload?: T): void {
            if (!this.handlers[eventName]) return;

            this.handlers[eventName].forEach(handler => {
                  const { callback, options } = handler;

                  // 防抖处理
                  if (options.debounceTime && options.debounceTime > 0) {
                        // 清除上一个计时器
                        if (handler.debounceTimer) {
                              window.clearTimeout(handler.debounceTimer);
                        }

                        // 设置新计时器
                        handler.debounceTimer = window.setTimeout(() => {
                              callback(payload);
                              handler.debounceTimer = null;
                        }, options.debounceTime);

                        return;
                  }

                  // 节流处理
                  if (options.throttleTime && options.throttleTime > 0) {
                        const currentTime = now();

                        // 如果没有上次执行时间或已经超过节流时间，则执行
                        if (!handler.throttleLastTime ||
                              currentTime - handler.throttleLastTime >= options.throttleTime) {
                              handler.throttleLastTime = currentTime;
                              callback(payload);
                        }

                        return;
                  }

                  // 普通执行
                  callback(payload);
            });
      }

      /**
       * 只订阅一次事件
       * @param eventName 事件名称
       * @param callback 回调函数
       * @param options 订阅选项
       */
      once<T = any>(
            eventName: string,
            callback: EventCallback<T>,
            options: EventSubscriptionOptions = {}
      ): void {
            const onceOptions = { ...options, identifier: `once_${Date.now()}_${Math.random()}` };

            const onceCallback = (payload: T) => {
                  callback(payload);
                  this.off(eventName, onceOptions.identifier);
            };

            this.on(eventName, onceCallback, onceOptions);
      }

      /**
       * 清除所有事件订阅
       */
      clear(): void {
            // 清除所有防抖计时器
            Object.values(this.handlers).forEach(handlers => {
                  handlers.forEach(handler => {
                        if (handler.debounceTimer) {
                              window.clearTimeout(handler.debounceTimer);
                        }
                  });
            });

            this.handlers = {};
            this.namespaces.clear();
      }

      /**
       * 清除指定命名空间的所有事件订阅
       * @param namespace 命名空间
       */
      clearNamespace(namespace: string): void {
            const eventNames = this.namespaces.get(namespace);
            if (!eventNames) return;

            eventNames.forEach(eventName => {
                  const fullEventName = `${namespace}:${eventName}`;

                  // 清除所有防抖计时器
                  if (this.handlers[fullEventName]) {
                        this.handlers[fullEventName].forEach(handler => {
                              if (handler.debounceTimer) {
                                    window.clearTimeout(handler.debounceTimer);
                              }
                        });
                  }

                  delete this.handlers[fullEventName];
            });

            this.namespaces.delete(namespace);
      }
}

// 创建单例实例
export const eventBus = new EventBus();

// 创建 Vue 插件
export const EventBusPlugin = {
      install(app: App) {
            app.config.globalProperties.$eventBus = eventBus;
            app.provide('eventBus', eventBus);
      }
};

// 导出事件名称常量
export const EVENT_NAMES = {
      // 用户相关事件
      USER_LOGIN: 'user:login',
      USER_LOGOUT: 'user:logout',
      USER_REGISTER: 'user:register',
      USER_UPDATE: 'user:update',
      TOKEN_EXPIRED: 'user:token-expired', // 新增事件类型
      TOKEN_REFRESH_NEEDED: 'user:token-refresh-needed', // 新增事件类型

      // 地址相关事件
      ADDRESS_LIST_UPDATED: 'address:list-updated',
      ADDRESS_CREATED: 'address:created',
      ADDRESS_UPDATED: 'address:updated',
      ADDRESS_DELETED: 'address:deleted',
      ADDRESS_DEFAULT_CHANGED: 'address:default-changed',

      // 购物车相关事件
      CART_UPDATED: 'cart:updated',
      CART_ITEM_ADDED: 'cart:item-added',
      CART_ITEM_UPDATED: 'cart:item-updated',
      CART_ITEM_DELETED: 'cart:item-deleted',

      // 收藏相关事件
      FAVORITE_UPDATED: 'favorite:updated',
      FAVORITE_ADDED: 'favorite:added',
      FAVORITE_REMOVED: 'favorite:removed',

      // QPay支付相关事件
      QPAY_PAYMENT_SUCCESS: 'qpay:payment_success',
      QPAY_PAYMENT_FAILED: 'qpay:payment_failed',
      QPAY_PAYMENT_CANCELLED: 'qpay:payment_cancelled',
      QPAY_PAYMENT_EXPIRED: 'qpay:payment_expired',

      // 全局事件
      CORE_SERVICES_READY: 'core:services-ready',
      APP_INIT: 'app:init',
      NETWORK_ERROR: 'network:error',
};