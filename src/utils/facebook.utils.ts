// src/utils/facebook.utils.ts
declare global {
    interface Window {
        fbAsyncInit: () => void;
        FB: any;
    }
}

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

/**
 * Facebook SDK 工具类
 */
export const facebookUtils = {
    /**
     * 初始化 Facebook SDK
     */
    initSDK(): Promise<void> {
        return new Promise((resolve) => {
            // 添加标志，防止重复初始化
            if (window.FB) {
                console.log('Facebook SDK已加载，跳过初始化');
                resolve();
                return;
            }

            // 添加调试日志
            console.log('开始加载Facebook SDK...');

            // 异步加载SDK
            (function (d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s) as HTMLScriptElement; js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                fjs.parentNode?.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));

            // 初始化SDK
            window.fbAsyncInit = function () {
                console.log('Facebook SDK加载完成，正在初始化...');
                window.FB.init({
                    appId: import.meta.env.VITE_FACEBOOK_APP_ID,
                    cookie: true,
                    xfbml: true,
                    version: 'v22.0'
                });
                console.log('Facebook SDK初始化完成');
                resolve();
            };
        });
    },

    /**
     * 检查登录状态
     */
    getLoginStatus(): Promise<FacebookAuthResponse> {
        return new Promise((resolve) => {
            window.FB.getLoginStatus((response: FacebookAuthResponse) => {
                resolve(response);
            });
        });
    },

    /**
     * 执行Facebook登录
     */
    // 执行Facebook登录
    // 执行Facebook登录
    login(scope = 'public_profile'): Promise<FacebookAuthResponse> {
        return new Promise((resolve, reject) => {
            // 先检查登录状态
            window.FB.getLoginStatus((statusResponse: FacebookAuthResponse) => {
                if (statusResponse.status === 'connected') {
                    // 用户已登录 Facebook 且已授权应用
                    console.log('用户已登录并授权应用，直接返回');
                    resolve(statusResponse);
                } else {
                    // 检测是否为移动设备
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    const isFacebookBrowser = navigator.userAgent.indexOf('FBAN') > -1 ||
                        navigator.userAgent.indexOf('FBAV') > -1;

                    if (isMobile || isFacebookBrowser) {
                        // 移动设备使用重定向方式
                        const redirectUri = `${window.location.origin}/login`;
                        const state = Math.random().toString(36).substring(2);
                        localStorage.setItem('fb_auth_state', state);

                        const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${import.meta.env.VITE_FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}&response_type=token`;

                        window.location.href = authUrl;
                    } else {
                        // 桌面设备使用弹窗方式
                        window.FB.login((loginResponse: FacebookAuthResponse) => {
                            if (loginResponse.status === 'connected') {
                                resolve(loginResponse);
                            } else {
                                reject(new Error('用户取消登录或未完全授权'));
                            }
                        }, {
                            scope,
                            return_scopes: true,
                            auth_type: 'rerequest' // 添加此参数以确保显示授权对话框
                        });
                    }
                }
            });
        });
    },

    /**
     * 获取用户信息
     */
    getUserInfo(fields = 'id,name'): Promise<any> {
        return new Promise((resolve, reject) => {
            // 直接将访问令牌作为参数传递，而不是使用全局设置
            window.FB.api('/me', {
                fields,
            }, (response: any) => {
                if (response && !response.error) {
                    resolve(response);
                } else {
                    reject(new Error('获取用户信息失败'));
                }
            });
        });
    },

    /**
     * 退出登录
     */
    logout(): Promise<void> {
        return new Promise((resolve) => {
            window.FB.logout(() => {
                resolve();
            });
        });
    }
};