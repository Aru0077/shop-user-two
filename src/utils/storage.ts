// src/utils/storage.ts
/**
 * 本地存储工具类
 * 提供读取、写入、删除本地存储的方法
 * 支持数据过期和版本控制
 */

// 缓存项的接口定义
interface CacheItem<T> {
      value: T;
      timestamp: number;
      version: string;
      expiry?: number; // 过期时间（毫秒），可选
}

// 存储选项接口
interface StorageOptions {
      prefix?: string; // 键名前缀，用于区分不同应用
      version?: string; // 缓存版本，用于版本控制
      defaultExpiry?: number; // 默认过期时间（毫秒）
}

// 默认选项
const defaultOptions: StorageOptions = {
      prefix: 'shop_',
      version: '1.0.0',
      defaultExpiry: 24 * 60 * 60 * 1000, // 默认24小时
};

export class StorageService {
      private options: StorageOptions;

      constructor(options: StorageOptions = {}) {
            this.options = { ...defaultOptions, ...options };
      }

      /**
       * 获取完整键名（带前缀）
       * @param key 存储键名
       * @returns 带前缀的完整键名
       */
      private getFullKey(key: string): string {
            return `${this.options.prefix}${key}`;
      }

      /**
       * 将数据存入本地存储
       * @param key 存储键名
       * @param value 要存储的数据
       * @param expiry 过期时间（毫秒），不传则使用默认过期时间
       * @returns 是否存储成功
       */
      set<T>(key: string, value: T, expiry?: number): boolean {
            try {
                  const fullKey = this.getFullKey(key);

                  const cacheItem: CacheItem<T> = {
                        value,
                        timestamp: Date.now(),
                        version: this.options.version || defaultOptions.version!,
                        expiry: expiry || this.options.defaultExpiry,
                  };

                  localStorage.setItem(fullKey, JSON.stringify(cacheItem));
                  return true;
            } catch (error) {
                  console.error('存储数据失败:', error);
                  return false;
            }
      }

      /**
       * 从本地存储获取数据
       * @param key 存储键名
       * @param defaultValue 默认值，当获取失败或数据过期时返回
       * @returns 存储的数据或默认值
       */
      get<T>(key: string, defaultValue: T | null = null): T | null {
            try {
                  const fullKey = this.getFullKey(key);
                  const json = localStorage.getItem(fullKey);

                  if (!json) {
                        return defaultValue;
                  }

                  const cacheItem = JSON.parse(json) as CacheItem<T>;

                  // 检查版本
                  if (cacheItem.version !== this.options.version) {
                        this.remove(key);
                        return defaultValue;
                  }

                  // 检查是否过期
                  if (cacheItem.expiry) {
                        const now = Date.now();
                        const expiryTime = cacheItem.timestamp + cacheItem.expiry;

                        if (now > expiryTime) {
                              this.remove(key);
                              return defaultValue;
                        }
                  }

                  return cacheItem.value;
            } catch (error) {
                  console.error('获取数据失败:', error);
                  return defaultValue;
            }
      }

      /**
       * 从本地存储删除数据
       * @param key 存储键名
       * @returns 是否删除成功
       */
      remove(key: string): boolean {
            try {
                  const fullKey = this.getFullKey(key);
                  localStorage.removeItem(fullKey);
                  return true;
            } catch (error) {
                  console.error('删除数据失败:', error);
                  return false;
            }
      }

      /**
       * 清除指定前缀的所有数据
       * @returns 是否清除成功
       */
      clear(): boolean {
            try {
                  const { prefix } = this.options;

                  // 获取所有以指定前缀开头的键
                  const keysToRemove = [];
                  for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith(prefix!)) {
                              keysToRemove.push(key);
                        }
                  }

                  // 删除匹配的键
                  keysToRemove.forEach(key => localStorage.removeItem(key));

                  return true;
            } catch (error) {
                  console.error('清除数据失败:', error);
                  return false;
            }
      }

      /**
       * 检查数据是否存在且未过期
       * @param key 存储键名
       * @returns 是否存在且未过期
       */
      has(key: string): boolean {
            try {
                  const fullKey = this.getFullKey(key);
                  const json = localStorage.getItem(fullKey);

                  if (!json) {
                        return false;
                  }

                  const cacheItem = JSON.parse(json) as CacheItem<any>;

                  // 检查版本
                  if (cacheItem.version !== this.options.version) {
                        return false;
                  }

                  // 检查是否过期
                  if (cacheItem.expiry) {
                        const now = Date.now();
                        const expiryTime = cacheItem.timestamp + cacheItem.expiry;

                        if (now > expiryTime) {
                              return false;
                        }
                  }

                  return true;
            } catch (error) {
                  console.error('检查数据失败:', error);
                  return false;
            }
      }

      /**
       * 更新数据过期时间
       * @param key 存储键名
       * @param expiry 新的过期时间（毫秒）
       * @returns 是否更新成功
       */
      updateExpiry(key: string, expiry: number): boolean {
            try {
                  const fullKey = this.getFullKey(key);
                  const json = localStorage.getItem(fullKey);

                  if (!json) {
                        return false;
                  }

                  const cacheItem = JSON.parse(json) as CacheItem<any>;
                  cacheItem.expiry = expiry;
                  cacheItem.timestamp = Date.now(); // 重置时间戳

                  localStorage.setItem(fullKey, JSON.stringify(cacheItem));
                  return true;
            } catch (error) {
                  console.error('更新过期时间失败:', error);
                  return false;
            }
      }
}

// 导出默认实例，方便直接使用
export const storage = new StorageService();

// 导出创建实例的方法，方便自定义配置
export const createStorage = (options: StorageOptions = {}) => {
      return new StorageService(options);
};