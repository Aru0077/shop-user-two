// src/stores/qpay.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { qpayApi } from '@/api/qpay.api';
import { storage } from '@/utils/storage';
import { createInitializeHelper } from '@/utils/store-helpers';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import { useUserStore } from '@/stores/user.store';
import { useOrderStore } from '@/stores/order.store';
import type {
      QPayInvoice,
      QPayStatusResponse,
      CreateQPayPaymentParams,
      QPayPaymentStatus
} from '@/types/qpay.type';
import type { ApiError } from '@/types/common.type';

/**
 * QPay支付状态管理
 * 负责管理QPay支付流程和状态
 */
export const useQPayStore = defineStore('qpay', () => {
      // 初始化助手
      const initHelper = createInitializeHelper('QPayStore');

      // 状态
      const currentInvoice = ref<QPayInvoice | null>(null);
      const paymentStatus = ref<QPayPaymentStatus | null>(null);
      const paymentMessage = ref<string | null>(null);
      const paymentId = ref<string | null>(null);
      const currentOrderId = ref<string | null>(null);
      const loading = ref(false);
      const polling = ref(false);
      const error = ref<string | null>(null);
      const pollingInterval = ref<number | null>(null);

      // 获取其他store
      const userStore = useUserStore();
      const orderStore = useOrderStore();

      // 计算属性
      const isPaid = computed(() => {
            return paymentStatus.value === 'PAID';
      });

      const isPending = computed(() => {
            return paymentStatus.value === 'PENDING';
      });

      const isCancelled = computed(() => {
            return paymentStatus.value === 'CANCELLED';
      });

      const isExpired = computed(() => {
            return paymentStatus.value === 'EXPIRED';
      });

      // ==================== 内部工具方法 ====================
      /**
       * 处理API错误
       */
      function handleError(error: ApiError, customMessage?: string): void {
            console.error(`[QPayStore] Error:`, error);
            const message = customMessage || error.message || '发生未知错误';
            toast.error(message);
      }

      /**
       * 确保已初始化
       */
      async function ensureInitialized(): Promise<void> {
            if (!initHelper.isInitialized()) {
                  console.info('[QPayStore] 数据未初始化，正在初始化...');
                  await init();
            }
      }

      /**
       * 设置事件监听
       */
      function setupEventListeners(): void {
            // 监听用户登出事件
            eventBus.on(EVENT_NAMES.USER_LOGOUT, () => {
                  clearQPayState();
                  initHelper.resetInitialization();
            });
      }

      /**
       * 保存QPay支付数据到本地存储
       */
      function saveToLocalStorage(): void {
            if (currentInvoice.value) {
                  const data = {
                        invoice: currentInvoice.value,
                        status: paymentStatus.value,
                        message: paymentMessage.value,
                        paymentId: paymentId.value,
                        orderId: currentOrderId.value,
                        timestamp: Date.now()
                  };
                  storage.set('qpay_payment_data', data, 1800000); // 30分钟过期
            }
      }

      /**
       * 从本地存储加载QPay支付数据
       */
      function loadFromLocalStorage(): boolean {
            const data = storage.get<{
                  invoice: QPayInvoice;
                  status: QPayPaymentStatus;
                  message: string;
                  paymentId: string | null;
                  orderId: string;
                  timestamp: number;
            }>('qpay_payment_data', null);

            if (data) {
                  // 检查数据是否过期（30分钟）
                  const now = Date.now();
                  const expiryTime = data.timestamp + 1800000; // 30分钟

                  if (now < expiryTime) {
                        currentInvoice.value = data.invoice;
                        paymentStatus.value = data.status;
                        paymentMessage.value = data.message;
                        paymentId.value = data.paymentId;
                        currentOrderId.value = data.orderId;
                        return true;
                  }
            }

            return false;
      }

      // ==================== 业务逻辑方法 ====================
      /**
       * 创建QPay支付
       * @param params 创建支付参数
       */
      async function createPayment(params: CreateQPayPaymentParams): Promise<QPayInvoice | null> {
            if (!userStore.isLoggedIn) {
                  toast.warning('请先登录');
                  return null;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  // 清除之前的状态
                  clearQPayState();

                  // 设置当前订单ID
                  currentOrderId.value = params.orderId;

                  // 创建QPay支付
                  const response = await qpayApi.createPayment(params);

                  // 如果返回的是支付状态而不是发票信息，说明支付已完成或出现特殊情况
                  if ('status' in response) {
                        paymentStatus.value = response.status;
                        paymentMessage.value = response.message;
                        paymentId.value = response.paymentId || null;

                        // 如果已支付，触发支付成功事件
                        if (response.status === 'PAID') {
                              eventBus.emit('qpay:payment_success', {
                                    orderId: response.orderId,
                                    paymentId: response.paymentId
                              });

                              toast.success('支付成功');
                        }

                        return null;
                  }

                  // 正常情况：返回发票信息
                  currentInvoice.value = response;
                  paymentStatus.value = 'PENDING';
                  paymentMessage.value = '等待支付';

                  // 保存到本地存储
                  saveToLocalStorage();

                  // 开始轮询支付状态
                  startPollingStatus(params.orderId);

                  return response;
            } catch (err: any) {
                  handleError(err, '创建支付失败');
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 检查支付状态
       * @param orderId 订单ID
       */
      async function checkPaymentStatus(orderId: string): Promise<QPayStatusResponse | null> {
            if (!userStore.isLoggedIn) {
                  toast.warning('请先登录');
                  return null;
            }

            try {
                  if (!polling.value) {
                        loading.value = true;
                  }
                  error.value = null;

                  const response = await qpayApi.checkPaymentStatus(orderId);

                  // 更新状态
                  paymentStatus.value = response.status;
                  paymentMessage.value = response.message;
                  paymentId.value = response.paymentId || null;
                  currentOrderId.value = response.orderId;

                  // 保存到本地存储
                  saveToLocalStorage();

                  // 如果支付成功或失败，停止轮询
                  if (response.status === 'PAID' || response.status === 'CANCELLED' || response.status === 'EXPIRED') {
                        stopPollingStatus();

                        // 如果支付成功，触发支付成功事件
                        if (response.status === 'PAID') {
                              eventBus.emit('qpay:payment_success', {
                                    orderId: response.orderId,
                                    paymentId: response.paymentId
                              });

                              toast.success('支付成功');
                              
                              // 添加这一行：清除订单缓存
                              storage.clearOrderCache();

                              // 刷新订单详情
                              if (orderStore.isInitialized()) {
                                    await orderStore.getOrderDetail(response.orderId);
                              }
                        }
                  }

                  return response;
            } catch (err: any) {
                  handleError(err, '检查支付状态失败');
                  return null;
            } finally {
                  if (!polling.value) {
                        loading.value = false;
                  }
            }
      }

      /**
       * 开始轮询支付状态
       * @param orderId 订单ID 
       */
      function startPollingStatus(orderId: string): void {
            // 如果已经在轮询，先停止
            stopPollingStatus();

            polling.value = true;

            // 设置轮询间隔（每3秒检查一次）
            pollingInterval.value = window.setInterval(async () => {
                  try {
                        await checkPaymentStatus(orderId);
                  } catch (err) {
                        console.error('轮询支付状态失败:', err);
                        // 错误时不停止轮询，继续尝试
                  }
            }, 5000);
      }

      /**
       * 停止轮询支付状态
       */
      function stopPollingStatus(): void {
            if (pollingInterval.value) {
                  window.clearInterval(pollingInterval.value);
                  pollingInterval.value = null;
            }
            polling.value = false;
      }

      /**
       * 清除QPay支付状态
       */
      function clearQPayState(): void {
            // 停止轮询
            stopPollingStatus();

            // 清除状态
            currentInvoice.value = null;
            paymentStatus.value = null;
            paymentMessage.value = null;
            paymentId.value = null;
            currentOrderId.value = null;
            error.value = null;

            // 清除本地存储
            storage.remove('qpay_payment_data');
      }

      /**
       * 初始化QPay模块
       */
      async function init(force: boolean = false): Promise<void> {
            if (!initHelper.canInitialize(force)) {
                  return;
            }

            initHelper.startInitialization();

            try {
                  // 从本地存储加载数据
                  loadFromLocalStorage();

                  // 如果有未完成的订单，开始轮询状态
                  if (currentOrderId.value && paymentStatus.value === 'PENDING') {
                        startPollingStatus(currentOrderId.value);
                  }

                  // 设置事件监听
                  setupEventListeners();

                  // 初始化成功
                  initHelper.completeInitialization();
            } catch (error) {
                  initHelper.failInitialization(error);
                  throw error;
            }
      }

      // 在组件卸载时清理定时器
      function cleanup(): void {
            stopPollingStatus();
      }

      return {
            // 状态
            currentInvoice,
            paymentStatus,
            paymentMessage,
            paymentId,
            currentOrderId,
            loading,
            polling,
            error,

            // 计算属性
            isPaid,
            isPending,
            isCancelled,
            isExpired,

            // 方法
            createPayment,
            checkPaymentStatus,
            startPollingStatus,
            stopPollingStatus,
            clearQPayState,
            init,
            cleanup,

            // 初始化状态
            isInitialized: initHelper.isInitialized,
            ensureInitialized
      };
});