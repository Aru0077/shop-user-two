// src/utils/facebook.utils.ts
// 定义全局类型
declare global {
    interface Window {
        _fbSDKInitialized?: boolean;
        fbAsyncInit: () => void;
        FB: {
            init: (options: {
                appId: string;
                cookie?: boolean;
                xfbml?: boolean;
                version: string;
            }) => void;
            login: (
                callback: (response: FacebookAuthResponse) => void,
                options?: FacebookLoginOptions
            ) => void;
            getLoginStatus: (
                callback: (response: FacebookAuthResponse) => void
            ) => void;
            logout: (callback: (response: any) => void) => void;
            api: (
                path: string,
                params: any,
                callback: (response: any) => void
            ) => void;
        };
        // 用于跨窗口通信
        fbCallbackHandler?: (data: any) => void;
    }
}

// Facebook 响应类型定义
export interface FacebookAuthResponse {
    status: 'connected' | 'not_authorized' | 'unknown';
    authResponse?: {
        accessToken: string;
        expiresIn: string;
        reauthorize_required_in: string;
        signedRequest: string;
        userID: string;
    };
}

// Facebook 登录选项类型定义
export interface FacebookLoginOptions {
    scope?: string;
    auth_type?: 'rerequest';
    return_scopes?: boolean;
}

/**
 * Facebook SDK 工具类
 */
export const facebookUtils = {
    /**
     * 加载 Facebook SDK
     */
    loadSDK(): Promise<void> {
        return new Promise((resolve) => {
            // 如果已经加载，直接返回
            if (window.FB) {
                resolve();
                return;
            }

            // 定义加载完成回调
            window.fbAsyncInit = function () {
                window.FB.init({
                    appId: import.meta.env.VITE_FACEBOOK_APP_ID,
                    cookie: true, // 启用cookie来支持自动登录
                    xfbml: true,
                    version: 'v22.0'
                });
                resolve();
            };

            // 加载 Facebook SDK
            (function (d, s, id) {
                const fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;

                const js = d.createElement(s) as HTMLScriptElement;
                js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";

                if (fjs && fjs.parentNode) {
                    fjs.parentNode.insertBefore(js, fjs);
                }
            }(document, 'script', 'facebook-jssdk'));
        });
    },

    /**
     * 生成Facebook登录URL (用于重定向和弹窗登录)
     */
    generateLoginUrl(scope = 'public_profile'): string {
        const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
        const state = Math.random().toString(36).substring(2);

        // 使用环境变量中配置的重定向URI
        const redirectUri = import.meta.env.VITE_FACEBOOK_REDIRECT_URI;

        // 保存state到localStorage以便验证回调
        localStorage.setItem('fb_login_state', state);

        return `https://www.facebook.com/v22.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&response_type=code`;
    },

    /**
     * 打开弹窗窗口进行登录 (桌面端)
     */
    openLoginPopup(scope = 'public_profile'): Promise<{ success: boolean; code?: string; error?: string }> {
        return new Promise((resolve) => {
            // 生成登录URL
            const loginUrl = this.generateLoginUrl(scope);

            // 窗口大小和位置计算
            const width = 600;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            // 打开弹窗
            const popup = window.open(
                loginUrl,
                'facebook_login',
                `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
            );

            if (!popup) {
                resolve({
                    success: false,
                    error: '无法打开登录窗口，请检查您的浏览器是否阻止了弹窗'
                });
                return;
            }

            // 设置窗口消息监听器
            window.fbCallbackHandler = (data) => {
                if (popup && !popup.closed) {
                    try {
                        popup.close();
                    } catch (e) {
                        console.error('关闭弹窗失败:', e);
                    }
                }

                if (data.success) {
                    resolve({ success: true, code: data.code });
                } else {
                    resolve({
                        success: false,
                        error: data.error || '登录失败'
                    });
                }
            };

            // 轮询检查窗口是否关闭
            const checkClosed = setInterval(() => {
                if (popup && popup.closed) {
                    clearInterval(checkClosed);
                    // 如果窗口被用户手动关闭，视为取消登录
                    if (window.fbCallbackHandler) {
                        resolve({ success: false, error: '登录已取消' });
                        window.fbCallbackHandler = undefined;
                    }
                }
            }, 500);
        });
    },

    /**
     * 退出登录
     */
    logout(): Promise<void> {
        return new Promise((resolve) => {
            if (!window.FB) {
                resolve();
                return;
            }

            window.FB.logout(() => {
                resolve();
            });
        });
    }
};