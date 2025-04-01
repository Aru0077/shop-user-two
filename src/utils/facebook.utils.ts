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
            // 检查SDK是否已加载
            if (window.FB) {
                resolve();
                return;
            }

            // 异步加载SDK
            (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s) as HTMLScriptElement; js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                fjs.parentNode?.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));

            // 初始化SDK
            window.fbAsyncInit = function() {
                window.FB.init({
                    appId: import.meta.env.VITE_FACEBOOK_APP_ID,
                    cookie: true,
                    xfbml: true,
                    version: 'v22.0'
                });
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
    login(scope = 'public_profile'): Promise<FacebookAuthResponse> {
        return new Promise((resolve, reject) => {
            window.FB.login((response: FacebookAuthResponse) => {
                if (response.status === 'connected') {
                    resolve(response);
                } else {
                    reject(new Error('用户取消登录或未完全授权'));
                }
            }, { scope });
        });
    },
    
    /**
     * 获取用户信息
     */
    getUserInfo(fields = 'id,name'): Promise<any> {
        return new Promise((resolve, reject) => {
            window.FB.api('/me', { fields }, (response: any) => {
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