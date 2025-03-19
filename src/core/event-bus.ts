// src/core/event-bus.ts
import type { App } from 'vue';

/**
 * 事件类型定义
 */
type EventCallback<T = any> = (payload: T) => void;

interface EventHandlers {
      [eventName: string]: EventCallback[];
}

/**
 * 事件总线类
 * 提供发布/订阅机制，用于服务之间的通信
 */
class EventBus {
      private handlers: EventHandlers = {};

      /**
       * 订阅事件
       * @param eventName 事件名称
       * @param callback 回调函数
       * @returns 取消订阅的函数
       */
      on<T = any>(eventName: string, callback: EventCallback<T>): () => void {
            if (!this.handlers[eventName]) {
                  this.handlers[eventName] = [];
            }

            this.handlers[eventName].push(callback as EventCallback);

            // 返回取消订阅的函数
            return () => {
                  this.off(eventName, callback);
            };
      }

      /**
       * 取消订阅事件
       * @param eventName 事件名称
       * @param callback 回调函数
       */
      off<T = any>(eventName: string, callback?: EventCallback<T>): void {
            if (!this.handlers[eventName]) return;

            if (!callback) {
                  // 如果没有提供回调，则删除该事件的所有订阅
                  delete this.handlers[eventName];
            } else {
                  // 删除特定的回调
                  this.handlers[eventName] = this.handlers[eventName].filter(
                        handler => handler !== callback
                  );
            }
      }

      /**
       * 发布事件
       * @param eventName 事件名称
       * @param payload 事件数据
       */
      emit<T = any>(eventName: string, payload?: T): void {
            if (!this.handlers[eventName]) return;

            this.handlers[eventName].forEach(callback => {
                  callback(payload);
            });
      }

      /**
       * 只订阅一次事件
       * @param eventName 事件名称
       * @param callback 回调函数
       */
      once<T = any>(eventName: string, callback: EventCallback<T>): void {
            const onceCallback = (payload: T) => {
                  callback(payload);
                  this.off(eventName, onceCallback);
            };

            this.on(eventName, onceCallback);
      }

      /**
       * 清除所有事件订阅
       */
      clear(): void {
            this.handlers = {};
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

      // 全局事件
      APP_INIT: 'app:init',
      NETWORK_ERROR: 'network:error',
};