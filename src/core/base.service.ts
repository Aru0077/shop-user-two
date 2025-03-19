// src/core/base.service.ts
import { eventBus } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import type { ApiError } from '@/types/common.type';

/**
 * 基础服务类
 * 所有服务可以继承此类获取基本功能
 */
export abstract class BaseService {
      /**
       * 服务名称
       */
      protected abstract readonly serviceName: string;

      /**
       * 保护的构造函数
       */
      protected constructor() {
            // 可以在这里添加服务初始化逻辑
      }

      /**
       * 发布事件
       * @param eventName 事件名称
       * @param payload 事件数据
       */
      protected emit<T = any>(eventName: string, payload?: T): void {
            eventBus.emit(eventName, payload);
      }

      /**
       * 订阅事件
       * @param eventName 事件名称
       * @param callback 回调函数
       * @returns 取消订阅函数
       */
      protected on<T = any>(eventName: string, callback: (payload: T) => void): () => void {
            return eventBus.on(eventName, callback);
      }

      /**
       * 处理API错误
       * @param error API错误
       * @param customMessage 自定义错误消息
       */
      protected handleError(error: ApiError, customMessage?: string): void {
            console.error(`[${this.serviceName}] Error:`, error);

            // 显示错误提示
            const message = customMessage || error.message || '发生未知错误';
            toast.error(message);
      }

      /**
       * 服务初始化方法
       * 子类可以覆盖此方法提供初始化逻辑
       */
      public async init(): Promise<void> {
            // 默认实现为空
      }
}