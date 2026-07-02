const rateLimit = new Map(); // userId -> { count, resetAt }

const AI_LIMIT = Number(process.env.AI_RATE_LIMIT_PER_HOUR || 500);
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function aiRateLimiter(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return next(); // unauthenticated requests pass through (auth middleware handles rejection)

  const now = Date.now();
  const record = rateLimit.get(userId);

  if (!record || now > record.resetAt) {
    rateLimit.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (record.count >= AI_LIMIT) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfterSec);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Maximum ${AI_LIMIT} AI calls per hour. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
      retryAfter: retryAfterSec
    });
  }

  record.count += 1;
  return next();
}

module.exports = { aiRateLimiter };
