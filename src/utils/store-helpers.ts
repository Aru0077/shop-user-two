// src/utils/store-helpers.ts
import { ref } from 'vue';

/**
 * 创建Store初始化状态管理
 * 提供一致的初始化状态跟踪机制
 */
export function createInitializeHelper(storeName: string) {
      // 初始化状态标志
      const initialized = ref(false);
      // 初始化锁，防止并发初始化
      const initializing = ref(false);

      /**
       * 检查是否已初始化
       * @returns 是否已初始化
       */
      function isInitialized(): boolean {
            return initialized.value;
      }

      /**
       * 检查是否可以执行初始化
       * @param force 是否强制重新初始化
       * @returns 是否可以执行初始化
       */
      function canInitialize(force: boolean = false): boolean {
            // 如果正在初始化中，则不允许重复初始化
            if (initializing.value) {
                  console.info(`[${storeName}] 初始化正在进行中，跳过重复调用`);
                  return false;
            }

            // 如果已初始化且不是强制重新初始化，则跳过
            if (initialized.value && !force) {
                  console.info(`[${storeName}] 已初始化，跳过重复初始化`);
                  return false;
            }

            return true;
      }

      /**
       * 开始初始化过程
       */
      function startInitialization(): void {
            initializing.value = true;
            if (initialized.value) {
                  console.info(`[${storeName}] 正在重新初始化...`);
            } else {
                  console.info(`[${storeName}] 开始初始化...`);
            }
      }

      /**
       * 完成初始化过程
       */
      function completeInitialization(): void {
            initialized.value = true;
            initializing.value = false;
            console.info(`[${storeName}] 初始化完成`);
      }

      /**
       * 初始化失败处理
       * @param error 错误信息
       */
      function failInitialization(error: any): void {
            initializing.value = false;
            console.error(`[${storeName}] 初始化失败:`, error);
      }

      /**
       * 重置初始化状态
       */
      function resetInitialization(): void {
            if (!initializing.value) {
                  initialized.value = false;
                  console.info(`[${storeName}] 初始化状态已重置`);
            } else {
                  console.warn(`[${storeName}] 无法重置，初始化正在进行中`);
            }
      }

      return {
            initialized,
            initializing,
            isInitialized,
            canInitialize,
            startInitialization,
            completeInitialization,
            failInitialization,
            resetInitialization
      };
}