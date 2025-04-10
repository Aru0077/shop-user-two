// src/stores/promotion.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { promotionApi } from '@/api/promotion.api';
import { storage, STORAGE_VERSIONS } from '@/utils/storage';
import { createInitializeHelper } from '@/utils/store-helpers';
import { toast } from '@/utils/toast.service';
import type { Promotion, EligiblePromotionResponse } from '@/types/promotion.type';
import type { ApiError } from '@/types/common.type';

/**
 * 促销管理Store
 * 负责促销规则的管理和计算
 */
export const usePromotionStore = defineStore('promotion', () => {
    // 初始化助手
    const initHelper = createInitializeHelper('PromotionStore');

    // 状态
    const promotions = ref<Promotion[]>([]);
    const currentEligiblePromotion = ref<EligiblePromotionResponse | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // 计算属性
    const activePromotions = computed(() => {
        return promotions.value.filter(promotion => promotion.isActive);
    });

    const amountOffPromotions = computed(() => {
        return activePromotions.value.filter(promotion => promotion.type === 'AMOUNT_OFF')
            .sort((a, b) => a.thresholdAmount - b.thresholdAmount);
    });

    const percentOffPromotions = computed(() => {
        return activePromotions.value.filter(promotion => promotion.type === 'PERCENT_OFF')
            .sort((a, b) => a.thresholdAmount - b.thresholdAmount);
    });

    // ==================== 内部工具方法 ====================
    /**
     * 处理API错误
     */
    function handleError(error: ApiError, customMessage?: string): void {
        console.error(`[PromotionStore] Error:`, error);
        const message = customMessage || error.message || 'An unknown error occurred';
        toast.error(message);
    }

    /**
     * 确保已初始化
     */
    async function ensureInitialized(): Promise<void> {
        if (!initHelper.isInitialized()) {
            console.info('[PromotionStore] 数据未初始化，正在初始化...');
            await init();
        }
    }

    // ==================== 业务逻辑方法 ====================
    /**
     * 获取可用促销规则
     */
    async function getAvailablePromotions(): Promise<Promotion[]> {
        try {
            loading.value = true;
            error.value = null;

            // 尝试从缓存获取
            const cachedPromotions = storage.get<Promotion[]>(storage.STORAGE_KEYS.PROMOTIONS, null, STORAGE_VERSIONS.PROMOTIONS);
            if (cachedPromotions) {
                promotions.value = cachedPromotions;
                return cachedPromotions;
            }

            // 从API获取
            const availablePromotions = await promotionApi.getAvailablePromotions();
            promotions.value = availablePromotions;

            // 缓存到本地
            storage.set(
                storage.STORAGE_KEYS.PROMOTIONS, 
                availablePromotions, 
                storage.STORAGE_EXPIRY.PROMOTIONS, 
                STORAGE_VERSIONS.PROMOTIONS
            );

            return availablePromotions;
        } catch (err: any) {
            handleError(err, 'Failed to get promotion rules');
            return [];
        } finally {
            loading.value = false;
        }
    }

    /**
     * 检查特定金额可用的满减规则
     * @param amount 订单金额
     */
    async function checkEligiblePromotion(amount: number): Promise<EligiblePromotionResponse | null> {
        try {
            loading.value = true;
            error.value = null;

            const response = await promotionApi.checkEligiblePromotion(amount);
            currentEligiblePromotion.value = response;

            return response;
        } catch (err: any) {
            handleError(err, 'Failed to check available promotion rules');
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 获取下一个可用的满减规则（用于提示用户）
     * @param amount 当前订单金额
     */
    function getNextAvailablePromotion(amount: number): Promotion | null {
        // 确保按门槛金额排序
        const sortedPromotions = [...amountOffPromotions.value].sort((a, b) => a.thresholdAmount - b.thresholdAmount);
        
        // 查找下一个可用的满减规则
        for (const promotion of sortedPromotions) {
            if (promotion.thresholdAmount > amount) {
                return promotion;
            }
        }
        
        return null;
    }

    /**
     * 计算当前金额能获得的最大优惠
     * @param amount 订单金额
     */
    function calculateBestPromotion(amount: number): { 
        promotion: Promotion | null; 
        discountAmount: number; 
        finalAmount: number;
    } {
        let bestPromotion: Promotion | null = null;
        let maxDiscount = 0;
        
        // 检查所有可用的促销规则
        for (const promotion of activePromotions.value) {
            if (amount >= promotion.thresholdAmount) {
                let discount = 0;
                
                if (promotion.type === 'AMOUNT_OFF') {
                    discount = promotion.discountAmount;
                } else if (promotion.type === 'PERCENT_OFF') {
                    discount = amount * (promotion.discountAmount / 100);
                }
                
                // 更新最佳优惠
                if (discount > maxDiscount) {
                    maxDiscount = discount;
                    bestPromotion = promotion;
                }
            }
        }
        
        // 计算最终金额
        const finalAmount = Math.max(0, amount - maxDiscount);
        
        return {
            promotion: bestPromotion,
            discountAmount: maxDiscount,
            finalAmount
        };
    }

    /**
     * 清除促销状态
     */
    function clearPromotionState(): void {
        promotions.value = [];
        currentEligiblePromotion.value = null;
        error.value = null;

        // 清除本地缓存
        storage.remove(storage.STORAGE_KEYS.PROMOTIONS);
    }

    /**
     * 初始化促销模块
     */
    async function init(force: boolean = false): Promise<void> {
        if (!initHelper.canInitialize(force)) {
            return;
        }

        initHelper.startInitialization();

        try {
            // 加载促销规则
            await getAvailablePromotions();

            // 初始化成功
            initHelper.completeInitialization();
        } catch (error) {
            initHelper.failInitialization(error);
            throw error;
        }
    }

    return {
        // 状态
        promotions,
        currentEligiblePromotion,
        loading,
        error,

        // 计算属性
        activePromotions,
        amountOffPromotions,
        percentOffPromotions,

        // 业务逻辑方法
        getAvailablePromotions,
        checkEligiblePromotion,
        getNextAvailablePromotion,
        calculateBestPromotion,
        clearPromotionState,
        init,

        // 初始化状态
        isInitialized: initHelper.isInitialized,
        ensureInitialized
    };
});