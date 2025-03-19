// src/utils/storage.ts
/**
 * 本地存储工具类
 * 提供读取、写入、删除本地存储的方法
 * 统一管理所有缓存键名和过期时间
 * 支持数据过期和版本控制
 */

// 缓存键名常量定义
export const STORAGE_KEYS = {
      // 用户相关
      TOKEN: 'user_token',
      TOKEN_EXPIRY: 'user_token_expiry',
      USER_INFO: 'user_info',

      // 地址相关
      ADDRESSES: 'user_addresses',

      // 购物车相关
      CART_DATA: 'cart_data',

      // 商品相关
      CATEGORIES: 'product_categories',
      HOME_DATA: 'home_page_data',
      RECENT_PRODUCTS: 'recent_viewed_products',
      PRODUCT_DETAIL_PREFIX: 'product_detail_',
      CATEGORY_PRODUCTS_PREFIX: 'category_products_',

      // 订单相关
      ORDER_LIST: 'order_list',
      ORDER_DETAIL_PREFIX: 'order_detail_',

      // 收藏相关
      FAVORITE_IDS: 'favorite_ids',
      FAVORITES_LIST: 'favorites_list',

      // 结算相关
      CHECKOUT_INFO: 'checkout_info',
      ORDER_PREVIEW: 'order_preview',

      // 临时订单相关
      TEMP_ORDER: 'temp_order',

      // 添加促销相关键
      PROMOTIONS: 'promotions',
};

// 缓存过期时间常量定义（毫秒）
export const STORAGE_EXPIRY = {
      // 默认过期时间
      DEFAULT: 24 * 60 * 60 * 1000, // 24小时

      // 用户认证相关
      AUTH: 7 * 24 * 60 * 60 * 1000, // 7天

      // 地址相关
      ADDRESSES: 12 * 60 * 60 * 1000, // 12小时

      // 购物车相关
      CART: 24 * 60 * 60 * 1000, // 1天

      // 商品相关
      CATEGORIES: 24 * 60 * 60 * 1000, // 24小时
      HOME_DATA: 4 * 60 * 60 * 1000, // 4小时
      PRODUCT_DETAIL: 30 * 60 * 1000, // 30分钟
      RECENT_PRODUCTS: 7 * 24 * 60 * 60 * 1000, // 7天
      CATEGORY_PRODUCTS: 10 * 60 * 1000, // 10分钟

      // 订单相关
      ORDER_LIST: 5 * 60 * 1000, // 5分钟
      ORDER_DETAIL: 10 * 60 * 1000, // 10分钟

      // 收藏相关
      FAVORITE_IDS: 12 * 60 * 60 * 1000, // 12小时
      FAVORITES_LIST: 30 * 60 * 1000, // 30分钟

      // 结算相关
      CHECKOUT_INFO: 30 * 60 * 1000, // 30分钟
      ORDER_PREVIEW: 5 * 60 * 1000, // 5分钟

      // 临时订单相关
      TEMP_ORDER: 10 * 60 * 1000, // 10分钟

      // 添加促销相关过期时间
      PROMOTIONS: 4 * 60 * 60 * 1000, // 4小时
};

// 数据版本常量
export const STORAGE_VERSIONS = {
      DEFAULT: '1.0.0',
      CART: '1.0.0',
      ADDRESSES: '1.0.0',
      FAVORITES: '1.0.0',
      CHECKOUT: '1.0.0',
      ORDER: '1.0.0',
      TEMP_ORDER: '1.0.0',
      PROMOTIONS: '1.0.0',
};

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
      version: STORAGE_VERSIONS.DEFAULT,
      defaultExpiry: STORAGE_EXPIRY.DEFAULT,
};

export class StorageService {
      private options: StorageOptions;
      public STORAGE_KEYS = STORAGE_KEYS;
      public STORAGE_EXPIRY = STORAGE_EXPIRY;

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
       * @param version 数据版本，不传则使用默认版本
       * @returns 是否存储成功
       */
      set<T>(key: string, value: T, expiry?: number, version?: string): boolean {
            try {
                  const fullKey = this.getFullKey(key);

                  const cacheItem: CacheItem<T> = {
                        value,
                        timestamp: Date.now(),
                        version: version || this.options.version || defaultOptions.version!,
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
       * @param version 期望的数据版本，不传则使用默认版本
       * @returns 存储的数据或默认值
       */
      get<T>(key: string, defaultValue: T | null = null, version?: string): T | null {
            try {
                  const fullKey = this.getFullKey(key);
                  const json = localStorage.getItem(fullKey);

                  if (!json) {
                        return defaultValue;
                  }

                  const cacheItem = JSON.parse(json) as CacheItem<T>;
                  const expectedVersion = version || this.options.version;

                  // 检查版本
                  if (expectedVersion && cacheItem.version !== expectedVersion) {
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
       * @param version 期望的数据版本，不传则使用默认版本
       * @returns 是否存在且未过期
       */
      has(key: string, version?: string): boolean {
            try {
                  const fullKey = this.getFullKey(key);
                  const json = localStorage.getItem(fullKey);

                  if (!json) {
                        return false;
                  }

                  const cacheItem = JSON.parse(json) as CacheItem<any>;
                  const expectedVersion = version || this.options.version;

                  // 检查版本
                  if (expectedVersion && cacheItem.version !== expectedVersion) {
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

      /**
       * 获取所有匹配前缀的键名
       * @param keyPrefix 键名前缀
       * @returns 匹配的键名数组
       */
      getKeys(keyPrefix: string): string[] {
            try {
                  const { prefix } = this.options;
                  const fullPrefix = `${prefix}${keyPrefix}`;
                  const matchingKeys = [];

                  for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith(fullPrefix)) {
                              // 返回不带应用前缀的键名
                              matchingKeys.push(key.substring(prefix!.length));
                        }
                  }

                  return matchingKeys;
            } catch (error) {
                  console.error('获取键名失败:', error);
                  return [];
            }
      }

      /**
       * 删除所有匹配前缀的键
       * @param keyPrefix 键名前缀
       * @returns 是否成功删除
       */
      removeByPrefix(keyPrefix: string): boolean {
            try {
                  const keys = this.getKeys(keyPrefix);
                  keys.forEach(key => this.remove(key));
                  return true;
            } catch (error) {
                  console.error('删除匹配前缀的键失败:', error);
                  return false;
            }
      }

      // ===== 用户相关方法 =====
      saveUserToken(token: string): boolean {
            return this.set(STORAGE_KEYS.TOKEN, token, STORAGE_EXPIRY.AUTH);
      }

      getUserToken(): string | null {
            return this.get(STORAGE_KEYS.TOKEN, null);
      }

      saveUserInfo<T>(userInfo: T): boolean {
            return this.set(STORAGE_KEYS.USER_INFO, userInfo, STORAGE_EXPIRY.AUTH);
      }

      getUserInfo<T>(): T | null {
            return this.get(STORAGE_KEYS.USER_INFO, null);
      }

      // ===== 购物车方法 =====
      saveCartData<T>(cartData: T): boolean {
            return this.set(STORAGE_KEYS.CART_DATA, cartData, STORAGE_EXPIRY.CART, STORAGE_VERSIONS.CART);
      }

      getCartData<T>(): T | null {
            return this.get(STORAGE_KEYS.CART_DATA, null, STORAGE_VERSIONS.CART);
      }

      // ===== 商品相关方法 =====
      saveCategories<T>(categories: T): boolean {
            return this.set(STORAGE_KEYS.CATEGORIES, categories, STORAGE_EXPIRY.CATEGORIES);
      }

      getCategories<T>(): T | null {
            return this.get(STORAGE_KEYS.CATEGORIES, null);
      }

      saveHomeData<T>(homeData: T): boolean {
            return this.set(STORAGE_KEYS.HOME_DATA, homeData, STORAGE_EXPIRY.HOME_DATA);
      }

      getHomeData<T>(): T | null {
            return this.get(STORAGE_KEYS.HOME_DATA, null);
      }

      saveProductDetail<T>(productId: number, detail: T): boolean {
            const key = `${STORAGE_KEYS.PRODUCT_DETAIL_PREFIX}${productId}`;
            return this.set(key, detail, STORAGE_EXPIRY.PRODUCT_DETAIL);
      }

      getProductDetail<T>(productId: number): T | null {
            const key = `${STORAGE_KEYS.PRODUCT_DETAIL_PREFIX}${productId}`;
            return this.get(key, null);
      }

      // ===== 地址相关方法 =====
      saveAddresses<T>(addresses: T): boolean {
            return this.set(STORAGE_KEYS.ADDRESSES, addresses, STORAGE_EXPIRY.ADDRESSES, STORAGE_VERSIONS.ADDRESSES);
      }

      getAddresses<T>(): T | null {
            return this.get(STORAGE_KEYS.ADDRESSES, null, STORAGE_VERSIONS.ADDRESSES);
      }

      // ===== 订单相关方法 =====
      saveOrderList<T>(page: number, limit: number, status: number | undefined, data: T): boolean {
            const statusStr = status !== undefined ? `_status${status}` : '';
            const key = `${STORAGE_KEYS.ORDER_LIST}_page${page}_limit${limit}${statusStr}`;
            return this.set(key, data, STORAGE_EXPIRY.ORDER_LIST, STORAGE_VERSIONS.ORDER);
      }

      getOrderList<T>(page: number, limit: number, status: number | undefined): T | null {
            const statusStr = status !== undefined ? `_status${status}` : '';
            const key = `${STORAGE_KEYS.ORDER_LIST}_page${page}_limit${limit}${statusStr}`;
            return this.get(key, null, STORAGE_VERSIONS.ORDER);
      }

      saveOrderDetail<T>(orderId: string, detail: T): boolean {
            const key = `${STORAGE_KEYS.ORDER_DETAIL_PREFIX}${orderId}`;
            return this.set(key, detail, STORAGE_EXPIRY.ORDER_DETAIL, STORAGE_VERSIONS.ORDER);
      }

      getOrderDetail<T>(orderId: string): T | null {
            const key = `${STORAGE_KEYS.ORDER_DETAIL_PREFIX}${orderId}`;
            return this.get(key, null, STORAGE_VERSIONS.ORDER);
      }

      clearOrderCache(): boolean {
            // 删除所有订单列表缓存
            this.removeByPrefix(STORAGE_KEYS.ORDER_LIST);
            // 删除所有订单详情缓存
            this.removeByPrefix(STORAGE_KEYS.ORDER_DETAIL_PREFIX);
            return true;
      }

      // ===== 收藏相关方法 =====
      saveFavoriteIds<T>(data: T): boolean {
            return this.set(STORAGE_KEYS.FAVORITE_IDS, data, STORAGE_EXPIRY.FAVORITE_IDS, STORAGE_VERSIONS.FAVORITES);
      }

      getFavoriteIds<T>(): T | null {
            return this.get(STORAGE_KEYS.FAVORITE_IDS, null, STORAGE_VERSIONS.FAVORITES);
      }

      saveFavoritesList<T>(data: T): boolean {
            return this.set(STORAGE_KEYS.FAVORITES_LIST, data, STORAGE_EXPIRY.FAVORITES_LIST, STORAGE_VERSIONS.FAVORITES);
      }

      getFavoritesList<T>(): T | null {
            return this.get(STORAGE_KEYS.FAVORITES_LIST, null, STORAGE_VERSIONS.FAVORITES);
      }

      // ===== 结算相关方法 =====
      saveCheckoutInfo<T>(data: T): boolean {
            return this.set(STORAGE_KEYS.CHECKOUT_INFO, data, STORAGE_EXPIRY.CHECKOUT_INFO, STORAGE_VERSIONS.CHECKOUT);
      }

      getCheckoutInfo<T>(): T | null {
            return this.get(STORAGE_KEYS.CHECKOUT_INFO, null, STORAGE_VERSIONS.CHECKOUT);
      }

      // ===== 临时订单相关方法 =====
      saveTempOrder<T>(data: T): boolean {
            return this.set(STORAGE_KEYS.TEMP_ORDER, data, STORAGE_EXPIRY.TEMP_ORDER, STORAGE_VERSIONS.TEMP_ORDER);
      }

      getTempOrder<T>(): T | null {
            return this.get(STORAGE_KEYS.TEMP_ORDER, null, STORAGE_VERSIONS.TEMP_ORDER);
      }
}

// 导出默认实例，方便直接使用
export const storage = new StorageService();

// 导出创建实例的方法，方便自定义配置
export const createStorage = (options: StorageOptions = {}) => {
      return new StorageService(options);
};