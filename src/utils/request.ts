// src/utils/request.ts
import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// 定义接口响应类型与后端对应
interface ApiResponse<T = any> {
      success: boolean;
      message: string;
      data?: T;
}

// 创建 axios 实例
const service = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '',
      timeout: 15000,
      headers: {
            'Content-Type': 'application/json',
      },
});

// 请求拦截器
service.interceptors.request.use(
      (config) => {
            // 从 localStorage 获取 token 并添加到请求头
            // const token = localStorage.getItem('token');
            // if (token && config.headers) {
            //       config.headers['Authorization'] = `Bearer ${token}`;
            // }
            return config;
      },
      (error) => {
            return Promise.reject(error);
      }
);

// 响应拦截器
service.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
            const { data } = response;

            // 检查响应是否符合后端结构
            if (data && data.hasOwnProperty('success')) {
                  // 如果请求不成功，抛出错误
                  if (!data.success) {
                        return Promise.reject(new Error(data.message || 'Request failed'));
                  }
                  // 如果请求成功，返回数据部分
                  return data.data;
            }

            // 如果响应不符合预期结构，返回原始数据
            return data;
      },
      (error: AxiosError<ApiResponse>) => {
            let message = 'Request Error';

            // 尝试从响应中获取错误信息
            if (error.response && error.response.data) {
                  message = error.response.data.message || 'Server Error';
            }

            // 这里可以添加全局错误处理，例如显示提示消息
            console.error(`API Error: ${message}`);

            return Promise.reject(error);
      }
);

// 通用请求方法
const request = <T = any>(config: AxiosRequestConfig): Promise<T> => {
      return service.request(config);
};

// 封装 HTTP 请求方法
export const http = {
      get: <T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> => {
            return request<T>({
                  ...config,
                  method: 'get',
                  url,
                  params,
            });
      },

      post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
            return request<T>({
                  ...config,
                  method: 'post',
                  url,
                  data,
            });
      },

      put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
            return request<T>({
                  ...config,
                  method: 'put',
                  url,
                  data,
            });
      },

      delete: <T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> => {
            return request<T>({
                  ...config,
                  method: 'delete',
                  url,
                  params,
            });
      },

      patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
            return request<T>({
                  ...config,
                  method: 'patch',
                  url,
                  data,
            });
      },
};

export default http;