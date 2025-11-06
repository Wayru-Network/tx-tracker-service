import { Context, Next } from 'koa';

interface ErrorWithStatus extends Error {
  status?: number;
  message: string;
}

export async function errorHandler(ctx: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (err: unknown) {
    const error = err as ErrorWithStatus;
    ctx.status = error.status ?? 500;
    ctx.body = {
      error: true,
      message: error.message ?? 'Internal server error',
    };

    // Emit error for logging
    ctx.app.emit('error', err, ctx);
  }
}

// Optional: Authentication validation middleware
export async function authValidator(ctx: Context, next: Next): Promise<void> {
  //@TODO: Add auth validation here

  await next();

}