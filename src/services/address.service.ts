// src/services/address.service.ts
import { addressApi } from '@/api/address.api';
import { storage, STORAGE_KEYS, STORAGE_VERSIONS } from '@/utils/storage';
import { authService } from '@/services/auth.service';
import type { UserAddress, CreateAddressParams, UpdateAddressParams } from '@/types/address.type';

// 状态变化回调类型
type AddressChangeCallback = (addresses: UserAddress[]) => void;

class AddressService {
    private lastFetchTime: number = 0;
    private stateChangeCallbacks: Set<AddressChangeCallback> = new Set();
    private authStateUnsubscribe: (() => void) | null = null;

    constructor() {
        // 监听认证状态变化
        this.authStateUnsubscribe = authService.onStateChange((isLoggedIn) => {
            if (!isLoggedIn) {
                this.clearAddressCache();
            }
        });
    }

    /**
     * 初始化地址服务
     */
    async init(): Promise<boolean> {
        try {
            // 只有登录状态下才加载地址
            if (authService.isLoggedIn.value) {
                await this.getAddresses();
                return true;
            }
            return false;
        } catch (err) {
            console.error('地址服务初始化失败:', err);
            return false;
        }
    }

    /**
     * 获取地址列表
     * @param forceRefresh 是否强制刷新
     */
    async getAddresses(forceRefresh = false): Promise<UserAddress[]> {
        // 如果未登录，返回空数组
        if (!authService.isLoggedIn.value) {
            return [];
        }

        // 检查是否需要强制刷新
        if (!forceRefresh) {
            // 先检查缓存
            const addressesCache = storage.getAddresses<{
                version: string,
                addresses: UserAddress[],
                timestamp: number
            }>();

            if (addressesCache && addressesCache.version === STORAGE_VERSIONS.ADDRESSES) {
                this.lastFetchTime = addressesCache.timestamp;
                // 通知状态变化
                this.notifyStateChange(addressesCache.addresses);
                return addressesCache.addresses;
            }
        }

        try {
            const addresses = await addressApi.getAddresses();
            this.lastFetchTime = Date.now();

            // 缓存地址
            this.saveAddressesToStorage(addresses);
            
            // 通知状态变化
            this.notifyStateChange(addresses);

            return addresses;
        } catch (err) {
            throw err;
        }
    }

    /**
     * 创建地址
     * @param params 创建地址参数
     */
    async createAddress(params: CreateAddressParams): Promise<UserAddress> {
        if (!authService.isLoggedIn.value) {
            throw new Error('用户未登录');
        }

        try {
            const response = await addressApi.createAddress(params);
            // 更新缓存
            await this.getAddresses(true);
            return response;
        } catch (err) {
            throw err;
        }
    }

    /**
     * 更新地址
     * @param id 地址ID
     * @param params 更新地址参数
     */
    async updateAddress(id: number, params: UpdateAddressParams): Promise<UserAddress> {
        if (!authService.isLoggedIn.value) {
            throw new Error('用户未登录');
        }

        try {
            const response = await addressApi.updateAddress(id, params);
            // 更新缓存
            await this.getAddresses(true);
            return response;
        } catch (err) {
            throw err;
        }
    }

    /**
     * 删除地址
     * @param id 地址ID
     */
    async deleteAddress(id: number): Promise<void> {
        if (!authService.isLoggedIn.value) {
            throw new Error('用户未登录');
        }

        try {
            await addressApi.deleteAddress(id);
            // 更新缓存
            await this.getAddresses(true);
        } catch (err) {
            throw err;
        }
    }

    /**
     * 设置默认地址
     * @param id 地址ID
     */
    async setDefaultAddress(id: number): Promise<UserAddress> {
        if (!authService.isLoggedIn.value) {
            throw new Error('用户未登录');
        }

        try {
            const response = await addressApi.setDefaultAddress(id);
            // 更新缓存
            await this.getAddresses(true);
            return response;
        } catch (err) {
            throw err;
        }
    }

    /**
     * 保存地址到存储
     */
    private saveAddressesToStorage(addresses: UserAddress[]): void {
        const addressData = {
            version: STORAGE_VERSIONS.ADDRESSES,
            addresses: addresses,
            timestamp: this.lastFetchTime
        };
        storage.saveAddresses(addressData);
    }

    /**
     * 清除地址缓存
     */
    clearAddressCache(): void {
        storage.remove(STORAGE_KEYS.ADDRESSES);
        this.notifyStateChange([]);
    }

    /**
     * 检查是否需要刷新地址
     */
    shouldRefreshAddresses(forceRefresh = false): boolean {
        if (forceRefresh) return true;
        if (!authService.isLoggedIn.value) return false;

        const now = Date.now();
        // 6小时刷新一次
        const refreshInterval = 6 * 60 * 60 * 1000;
        return (now - this.lastFetchTime > refreshInterval);
    }

    /**
     * 添加状态变化监听器
     * @param callback 回调函数
     * @returns 取消监听的函数
     */
    onAddressChange(callback: AddressChangeCallback): () => void {
        this.stateChangeCallbacks.add(callback);
        return () => this.stateChangeCallbacks.delete(callback);
    }

    /**
     * 通知状态变化
     */
    private notifyStateChange(addresses: UserAddress[]): void {
        this.stateChangeCallbacks.forEach(callback => callback(addresses));
    }

    /**
     * 清理资源
     */
    dispose(): void {
        if (this.authStateUnsubscribe) {
            this.authStateUnsubscribe();
            this.authStateUnsubscribe = null;
        }
        this.stateChangeCallbacks.clear();
    }
}

// 创建单例
export const addressService = new AddressService();