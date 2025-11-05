import { Context, Middleware } from 'koa';


export interface CtxBase<TBody = Record<string, never>, TParams = Record<string, never>> extends Context {
    request: Context['request'] & {
        body: TBody;
    };
    params: TParams;
    state: {
        user?: object;
    }
}


export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';


export interface Route<_TBody = Record<string, never>, _TParams = Record<string, never>> {
    method: HttpMethod;
    path: string;
    handler: Middleware;
}