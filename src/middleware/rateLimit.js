const buckets = new Map();

export function rateLimit({ windowMs = 5000, max = 8 } = {}) {
  return async (ctx, next) => {
    const id = ctx.from?.id;
    if (!id) return next();
    const now = Date.now();
    const b = buckets.get(id) || { count: 0, resetAt: now + windowMs };
    if (now > b.resetAt) {
      b.count = 0;
      b.resetAt = now + windowMs;
    }
    b.count++;
    buckets.set(id, b);
    if (b.count > max) return; // silently drop
    return next();
  };
}