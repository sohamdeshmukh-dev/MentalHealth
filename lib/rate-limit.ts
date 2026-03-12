// lib/rate-limit.ts
// OWASP: Basic In-Memory IP Rate Limiter to prevent brute force / spam
type RateLimitStore = {
    count: number;
    resetTime: number;
};

const rateLimitMap = new Map<string, RateLimitStore>();

export function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const store = rateLimitMap.get(ip);

    // If no record exists, or the time window has passed, reset the counter
    if (!store || now > store.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
    }

    // If within the window, check if they exceeded the limit
    if (store.count >= maxRequests) {
        return false; // RATE LIMITED
    }

    // Otherwise, increment the count
    store.count += 1;
    rateLimitMap.set(ip, store);
    return true;
}
