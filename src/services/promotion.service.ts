// src/services/promotion.service.ts
import { promotionApi } from '@/api/promotion.api';
import { storage, STORAGE_KEYS, STORAGE_VERSIONS } from '@/utils/storage';
import { authService } from '@/services/auth.service';
import type { Promotion, EligiblePromotionResponse } from '@/types/promotion.type';

// 状态变化回调类型
type PromotionsChangeCallback = (promotions: Promotion[]) => void;
type EligiblePromotionChangeCallback = (promotion: EligiblePromotionResponse | null) => void;

class PromotionService {
      private lastFetchTime: number = 0;
      private promotionsChangeCallbacks: Set<PromotionsChangeCallback> = new Set();
      private eligiblePromotionChangeCallbacks: Set<EligiblePromotionChangeCallback> = new Set();
      private authStateUnsubscribe: (() => void) | null = null;

      // 存储键名和版本常量
      private readonly CACHE_KEY = STORAGE_KEYS.PROMOTIONS || 'promotions';
      private readonly CACHE_VERSION = STORAGE_VERSIONS.PROMOTIONS || STORAGE_VERSIONS.DEFAULT;

      constructor() {
            // 监听认证状态变化
            this.authStateUnsubscribe = authService.onStateChange((isLoggedIn) => {
                  if (!isLoggedIn) {
                        this.clearPromotionCache();
                  }
            });
      }

      /**
       * 初始化促销服务
       */
      async init(): Promise<boolean> {
            try {
                  await this.getAvailablePromotions();
                  return true;
            } catch (err) {
                  console.error('促销服务初始化失败:', err);
                  return false;
            }
      }

      /**
       * 获取可用促销规则
       * @param forceRefresh 是否强制刷新
       */
      async getAvailablePromotions(forceRefresh = false): Promise<Promotion[]> {
            // 检查是否需要强制刷新
            if (!forceRefresh) {
                  // 先检查缓存
                  const promotionsCache = storage.get<{
                        version: string,
                        promotions: Promotion[],
                        timestamp: number
                  }>(this.CACHE_KEY, null);

                  if (promotionsCache && promotionsCache.version === this.CACHE_VERSION) {
                        this.lastFetchTime = promotionsCache.timestamp;
                        this.notifyPromotionsChange(promotionsCache.promotions);
                        return promotionsCache.promotions;
                  }
            }

            try {
                  const promotions = await promotionApi.getAvailablePromotions();
                  this.lastFetchTime = Date.now();

                  // 缓存促销规则
                  this.savePromotionsToStorage(promotions);

                  // 通知状态变化
                  this.notifyPromotionsChange(promotions);

                  return promotions;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 检查特定金额可用的满减规则
       * @param amount 订单金额
       */
      async checkEligiblePromotion(amount: number): Promise<EligiblePromotionResponse | null> {
            try {
                  const response = await promotionApi.checkEligiblePromotion(amount);

                  // 通知状态变化
                  this.notifyEligiblePromotionChange(response);

                  return response;
            } catch (err) {
                  this.notifyEligiblePromotionChange(null);
                  return null;
            }
      }

      /**
       * 保存促销规则到存储
       */
      private savePromotionsToStorage(promotions: Promotion[]): void {
            const promotionsData = {
                  version: this.CACHE_VERSION,
                  promotions: promotions,
                  timestamp: this.lastFetchTime
            };
            storage.set(this.CACHE_KEY, promotionsData);
      }

      /**
       * 清除促销缓存
       */
      clearPromotionCache(): void {
            storage.remove(this.CACHE_KEY);
            this.notifyPromotionsChange([]);
            this.notifyEligiblePromotionChange(null);
      }

      /**
       * 检查是否需要刷新促销
       */
      shouldRefreshPromotions(forceRefresh = false): boolean {
            if (forceRefresh) return true;

            const now = Date.now();
            // 4小时刷新一次
            const refreshInterval = 4 * 60 * 60 * 1000;
            return (now - this.lastFetchTime > refreshInterval);
      }

      /**
       * 添加促销规则变化监听器
       */
      onPromotionsChange(callback: PromotionsChangeCallback): () => void {
            this.promotionsChangeCallbacks.add(callback);
            return () => this.promotionsChangeCallbacks.delete(callback);
      }

      /**
       * 添加可用促销变化监听器
       */
      onEligiblePromotionChange(callback: EligiblePromotionChangeCallback): () => void {
            this.eligiblePromotionChangeCallbacks.add(callback);
            return () => this.eligiblePromotionChangeCallbacks.delete(callback);
      }

      /**
       * 通知促销规则变化
       */
      private notifyPromotionsChange(promotions: Promotion[]): void {
            this.promotionsChangeCallbacks.forEach(callback => callback(promotions));
      }

      /**
       * 通知可用促销变化
       */
      private notifyEligiblePromotionChange(promotion: EligiblePromotionResponse | null): void {
            this.eligiblePromotionChangeCallbacks.forEach(callback => callback(promotion));
      }

      /**
       * 清理资源
       */
      dispose(): void {
            if (this.authStateUnsubscribe) {
                  this.authStateUnsubscribe();
                  this.authStateUnsubscribe = null;
            }
            this.promotionsChangeCallbacks.clear();
            this.eligiblePromotionChangeCallbacks.clear();
      }
}

// 创建单例
export const promotionService = new PromotionService();