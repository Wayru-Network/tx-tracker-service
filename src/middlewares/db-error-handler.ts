import { Context, Next } from 'koa';

interface DatabaseError extends Error {
  status?: number;
  message: string;
  code?: string;
}

export async function dbErrorHandler(ctx: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (err: unknown) {
    const error = err as DatabaseError;
    ctx.status = error.status ?? 500;
    ctx.body = {
      error: {
        message: error.message ?? 'Internal server error',
        code: error.code
      }
    };
    ctx.app.emit('error', err, ctx);
  }
}