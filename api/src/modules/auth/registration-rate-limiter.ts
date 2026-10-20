import { Injectable, TooManyRequestsException } from '@nestjs/common';

interface RateWindow {
  startedAt: number;
  count: number;
}

@Injectable()
export class RegistrationRateLimiter {
  private readonly windows = new Map<string, RateWindow>();
  private readonly limit = 5;
  private readonly windowMs = 60 * 60 * 1000;

  consume(email: string, ip: string): void {
    const now = Date.now();
    const keys = [`email:${email}`, `ip:${ip}`];

    for (const [key, window] of this.windows) {
      if (now - window.startedAt >= this.windowMs) this.windows.delete(key);
    }

    if (keys.some((key) => (this.windows.get(key)?.count ?? 0) >= this.limit)) {
      throw new TooManyRequestsException({
        code: 'RATE_LIMITED',
        message: 'Too many registration requests. Try again later.',
      });
    }

    for (const key of keys) {
      const window = this.windows.get(key);
      if (window) window.count += 1;
      else this.windows.set(key, { startedAt: now, count: 1 });
    }
  }
}
