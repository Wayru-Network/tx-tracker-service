import { Context } from 'koa';


export interface CtxBase<TBody = any, TParams = any> extends Context {
    request: Context['request'] & {
        body: TBody;
    };
    params: TParams;
    state: {
        user?: object;
    }
}


export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';


export interface Route<T = any> {
    method: HttpMethod;
    path: string;
    handler: (ctx: CtxBase<T>) => Promise<void>;
}