// src/stores/promotion.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/index.api';
import { storage } from '@/utils/storage'; 
import { toast } from '@/utils/toast.service';
import type { Promotion, EligiblePromotionResponse } from '@/types/promotion.type';
import type { ApiError } from '@/types/common.type';
import { createInitializeHelper } from '@/utils/store-helpers';

/**
 * 促销规则状态存储与服务
 * 集成状态管理和业务逻辑
 */
export const usePromotionStore = defineStore('promotion', () => {
    // 创建初始化助手
    const initHelper = createInitializeHelper('PromotionStore');

    // ==================== 状态 ====================
    const promotions = ref<Promotion[]>([]);
    const loading = ref<boolean>(false);

    // ==================== Getters ====================
    const activePromotions = computed(() => 
        promotions.value.filter(promo => promo.isActive)
    );

    // ==================== 内部工具方法 ====================
    /**
     * 处理API错误
     * @param error API错误
     * @param customMessage 自定义错误消息
     */
    function handleError(error: ApiError, customMessage?: string): void {
        console.error(`[PromotionStore] Error:`, error);

        // 显示错误提示
        const message = customMessage || error.message || '发生未知错误';
        toast.error(message);
    }

    /**
     * 设置事件监听
     */
    function setupEventListeners(): void {
        // 可以在这里添加事件监听，如订单金额变化等
    }

    // ==================== 状态管理方法 ====================
    /**
     * 设置促销规则列表
     */
    function setPromotions(promotionList: Promotion[]) {
        promotions.value = promotionList;
    }

    /**
     * 设置加载状态
     */
    function setLoading(isLoading: boolean) {
        loading.value = isLoading;
    }

    /**
     * 清除促销数据
     */
    function clearPromotions() {
        promotions.value = [];
        storage.remove(storage.STORAGE_KEYS.PROMOTIONS);
    }

    // ==================== 业务逻辑方法 ====================
    /**
     * 获取可用促销规则
     */
    async function getAvailablePromotions(): Promise<Promotion[]> {
        if (loading.value) {
            return promotions.value;
        }

        setLoading(true);

        try {
            // 尝试从缓存获取
            const cachedPromotions = storage.get<Promotion[]>(storage.STORAGE_KEYS.PROMOTIONS, null);
            if (cachedPromotions) {
                setPromotions(cachedPromotions);
                return cachedPromotions;
            }

            // 从API获取
            const fetchedPromotions = await api.promotionApi.getAvailablePromotions();

            // 缓存促销列表
            storage.set(storage.STORAGE_KEYS.PROMOTIONS, fetchedPromotions, storage.STORAGE_EXPIRY.PROMOTIONS);

            // 更新状态
            setPromotions(fetchedPromotions);

            return fetchedPromotions;
        } catch (error: any) {
            handleError(error, '获取促销规则失败');
            return [];
        } finally {
            setLoading(false);
        }
    }

    /**
     * 检查特定金额可用的满减规则
     * @param amount 订单金额
     */
    async function checkEligiblePromotion(amount: number): Promise<EligiblePromotionResponse | null> {
        if (loading.value) {
            return null; // 这里返回null，因为这个方法没有保存中间结果
        }
        setLoading(true);

        try {
            const eligiblePromotion = await api.promotionApi.checkEligiblePromotion(amount);
            return eligiblePromotion;
        } catch (error: any) {
            handleError(error, '检查满减规则失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 初始化促销模块
     */
    async function init(): Promise<void> {
        if (!initHelper.canInitialize()) {
            return;
        }

        initHelper.startInitialization();

        try {
            await getAvailablePromotions();
            // 初始化成功
            initHelper.completeInitialization();
        } catch (error) {
            initHelper.failInitialization(error);
            throw error;
        }
    }

    // 立即初始化事件监听
    setupEventListeners();

    return {
        // 状态
        promotions,
        loading,

        // Getters
        activePromotions,

        // 状态管理方法
        setPromotions,
        setLoading,
        clearPromotions,

        // 业务逻辑方法
        getAvailablePromotions,
        checkEligiblePromotion,
        init,
        isInitialized: initHelper.isInitialized
    };
});