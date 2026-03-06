import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Global interceptor that converts Prisma Decimal instances to JavaScript numbers
 * in all API responses. This ensures consistent `number` type on the frontend
 * without requiring manual `.toNumber()` calls in every service method.
 */
@Injectable()
export class DecimalSerializationInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => this.transformDecimals(data)));
  }

  private transformDecimals(value: unknown): unknown {
    if (value instanceof Decimal) {
      return value.toNumber();
    }

    if (value instanceof Date) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.transformDecimals(item));
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.transformDecimals(val);
      }
      return result;
    }

    return value;
  }
}
