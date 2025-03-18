// src/stores/promotion.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { promotionService } from '@/services/promotion.service';
import type { Promotion, EligiblePromotionResponse } from '@/types/promotion.type';

export const usePromotionStore = defineStore('promotion', () => {
      // 状态
      const promotions = ref<Promotion[]>([]);
      const currentEligiblePromotion = ref<EligiblePromotionResponse | null>(null);
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);
      const lastFetchTime = ref<number>(0);
      // 初始化状态跟踪变量
      const isInitialized = ref<boolean>(false);
      const isInitializing = ref<boolean>(false);

      // 注册促销变化监听，在组件销毁时取消订阅
      let unsubscribePromotionsChange: (() => void) | null = null;
      let unsubscribeEligiblePromotionChange: (() => void) | null = null;

      // 计算属性
      const activePromotions = computed(() => {
            return promotions.value.filter(p => p.isActive);
      });

      // 初始化方法
      async function init() {
            // 避免重复初始化
            if (isInitialized.value || isInitializing.value) return;
            isInitializing.value = true;

            try {
                  // 监听促销服务的状态变化
                  if (!unsubscribePromotionsChange) {
                        unsubscribePromotionsChange = promotionService.onPromotionsChange((newPromotions) => {
                              promotions.value = newPromotions;
                        });
                  }

                  if (!unsubscribeEligiblePromotionChange) {
                        unsubscribeEligiblePromotionChange = promotionService.onEligiblePromotionChange((newPromotion) => {
                              currentEligiblePromotion.value = newPromotion;
                        });
                  }

                  // 初始化促销服务
                  await promotionService.init();

                  isInitialized.value = true;
                  return true;
            } catch (err) {
                  console.error('促销初始化失败:', err);
                  return false;
            } finally {
                  isInitializing.value = false;
            }
      }

      // 获取可用促销规则
      async function fetchPromotions(forceRefresh = false) {
            loading.value = true;
            error.value = null;

            try {
                  const result = await promotionService.getAvailablePromotions(forceRefresh);
                  lastFetchTime.value = Date.now();
                  return result;
            } catch (err: any) {
                  error.value = err.message || '获取促销规则失败';
                  console.error('获取促销规则失败:', err);
                  return [];
            } finally {
                  loading.value = false;
            }
      }

      // 检查特定金额可用的满减规则
      async function checkEligiblePromotion(amount: number) {
            loading.value = true;
            error.value = null;

            try {
                  const result = await promotionService.checkEligiblePromotion(amount);
                  return result;
            } catch (err: any) {
                  error.value = err.message || '检查促销资格失败';
                  console.error('检查促销资格失败:', err);
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      // 按类型查找促销
      function findPromotionsByType(type: string): Promotion[] {
            return promotions.value.filter(p => p.type === type && p.isActive);
      }

      // 清除促销缓存
      function clearPromotionCache() {
            promotionService.clearPromotionCache();
      }

      // 在一定时间后刷新促销
      async function refreshPromotionsIfNeeded(forceRefresh = false) {
            if (promotionService.shouldRefreshPromotions(forceRefresh)) {
                  await fetchPromotions(true);
            }
      }

      // 清理资源
      function dispose() {
            if (unsubscribePromotionsChange) {
                  unsubscribePromotionsChange();
                  unsubscribePromotionsChange = null;
            }

            if (unsubscribeEligiblePromotionChange) {
                  unsubscribeEligiblePromotionChange();
                  unsubscribeEligiblePromotionChange = null;
            }
      }

      return {
            // 状态
            isInitialized,
            isInitializing,
            promotions,
            currentEligiblePromotion,
            loading,
            error,
            lastFetchTime,

            // 计算属性
            activePromotions,

            // 动作
            init,
            fetchPromotions,
            checkEligiblePromotion,
            findPromotionsByType,
            clearPromotionCache,
            refreshPromotionsIfNeeded,
            dispose
      };
});