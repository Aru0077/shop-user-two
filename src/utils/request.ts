// src/utils/request.ts
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { storage } from '@/utils/storage'; 
import { authService } from '@/services/auth.service';

// 定义接口响应类型与后端对应
interface ApiResponse<T = any> {
      success: boolean;
      message: string;
      data?: T;
}

// 扩展AxiosRequestConfig类型
interface RequestConfig extends AxiosRequestConfig {
      useCache?: boolean;
}

// 错误码枚举
enum ErrorCode {
      UNAUTHORIZED = 401,
      FORBIDDEN = 403,
      NOT_FOUND = 404,
      TIMEOUT = 408,
      SERVER_ERROR = 500
}

// 创建 axios 实例
const service: AxiosInstance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '',
      timeout: 15000,
      headers: {
            'Content-Type': 'application/json',
      },
});

// 请求控制器映射，用于取消请求
const pendingRequests = new Map<string, AbortController>();

// 生成请求的唯一key
const getRequestKey = (config: AxiosRequestConfig): string => {
      const { url, method, params, data } = config;
      return `${method}_${url}_${JSON.stringify(params)}_${JSON.stringify(data)}`;
};

// 添加请求到pendingRequests
const addPendingRequest = (config: AxiosRequestConfig): void => {
      const requestKey = getRequestKey(config);
      if (pendingRequests.has(requestKey)) {
            // 如果有相同的请求正在进行中，取消之前的请求
            pendingRequests.get(requestKey)?.abort();
            pendingRequests.delete(requestKey);
      }

      const controller = new AbortController();
      config.signal = controller.signal;
      pendingRequests.set(requestKey, controller);
};

// 移除请求从pendingRequests
const removePendingRequest = (config: AxiosRequestConfig): void => {
      const requestKey = getRequestKey(config);
      pendingRequests.delete(requestKey);
};

// 请求拦截器
service.interceptors.request.use(
      (config) => {
            // 添加请求到pendingRequests进行管理
            addPendingRequest(config);

            // 从 localStorage 获取 token 并添加到请求头
            const token = storage.getUserToken();

            if (token && config.headers) {
                  config.headers['Authorization'] = `Bearer ${token}`;
            }
            return config;
      },
      (error) => {
            return Promise.reject(error);
      }
);

// 响应拦截器
service.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
            console.log('成功结果', response);

            // 请求完成后，从pendingRequests中移除
            removePendingRequest(response.config);

            const { data } = response;

            // 检查响应是否符合后端结构
            if (data && 'success' in data) {
                  // 如果请求不成功，抛出错误
                  if (!data.success) {
                        return Promise.reject(new Error(data.message || 'Request failed'));
                  }

                  // 修改响应数据，但保持AxiosResponse结构
                  return data.data;
            }

            // 保持原始响应结构
            return response.data;
      },
      (error) => {
            console.log('错误结果', error);

            // 如果请求被取消，不处理错误
            if (axios.isCancel(error)) {
                  console.log('Request canceled:', error.message);
                  return Promise.reject(new Error('Request canceled'));
            }

            // 请求完成后，从pendingRequests中移除
            if (error.config) {
                  removePendingRequest(error.config);
            }

            let message = 'Request Error';
            let errorCode = error.response?.status || 500;

            // 尝试从响应中获取错误信息
            if (error.response && error.response.data && typeof error.response.data === 'object') {
                  const errorData = error.response.data as any;
                  message = errorData.message || 'Server Error';
            }

            // 根据状态码处理不同类型的错误
            switch (errorCode) {
                  case ErrorCode.UNAUTHORIZED:
                        // 统一使用authService处理Token过期
                        authService.handleTokenExpired();
                        break;
                  case ErrorCode.FORBIDDEN:
                        message = '没有权限访问该资源';
                        break;
                  case ErrorCode.NOT_FOUND:
                        message = '请求的资源不存在';
                        break;
                  case ErrorCode.TIMEOUT:
                        message = '请求超时，请稍后重试';
                        break;
                  case ErrorCode.SERVER_ERROR:
                        message = '服务器错误，请联系管理员';
                        break;
                  default:
                        if (error.message && error.message.includes('timeout')) {
                              message = '请求超时，请检查网络连接';
                        } else if (!navigator.onLine) {
                              message = '网络连接已断开，请检查网络';
                        }
            }

            // 在这里可以添加全局错误处理，例如显示提示消息
            console.error(`API Error: ${message}`);

            // 返回格式化的错误对象
            return Promise.reject({
                  code: errorCode,
                  message,
                  data: error.response?.data
            });
      }
);

// 通用请求方法
const request = <T = any>(config: RequestConfig): Promise<T> => {
      return service.request(config) as Promise<T>;
};

// 封装 HTTP 请求方法
export const http = {
      // 支持请求缓存的GET方法
      get: <T = any>(url: string, params?: any, config?: RequestConfig): Promise<T> => {
            // 无论URL是否已包含查询参数，都统一处理params对象
            return request<T>({
                  ...config,
                  method: 'get',
                  url,
                  params,  // 保留params参数，axios会正确处理已有查询参数的情况
            });
      },

      post: <T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> => {
            return request<T>({
                  ...config,
                  method: 'post',
                  url,
                  data,
            });
      },

      put: <T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> => {
            return request<T>({
                  ...config,
                  method: 'put',
                  url,
                  data,
            });
      },

      delete: <T = any>(url: string, params?: any, config?: RequestConfig): Promise<T> => {
            return request<T>({
                  ...config,
                  method: 'delete',
                  url,
                  params,
            });
      },

      patch: <T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> => {
            return request<T>({
                  ...config,
                  method: 'patch',
                  url,
                  data,
            });
      },

      // 创建可取消的请求
      cancelable: <T = any>(config: RequestConfig): { request: Promise<T>; cancel: (reason?: string) => void } => {
            const controller = new AbortController();
            const cancel = (reason?: string) => controller.abort(reason);

            const requestConfig = {
                  ...config,
                  signal: controller.signal
            };

            return {
                  request: request<T>(requestConfig),
                  cancel
            };
      }
};

export default http;