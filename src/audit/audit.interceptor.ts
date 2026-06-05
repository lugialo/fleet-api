import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from './audit.service';

type AuditedRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    const baseAudit = {
      user_id: request.user?.id,
      user_nickname: request.user?.nickname,
      method: request.method,
      route: request.originalUrl,
      payload: this.getPayload(request),
    };

    return next.handle().pipe(
      tap(() => {
        void this.auditService.create({
          ...baseAudit,
          status_code: response.statusCode,
        });
      }),
      catchError((error: unknown) => {
        void this.auditService.create({
          ...baseAudit,
          status_code: response.statusCode,
          error_message:
            error instanceof Error ? error.message : 'Unknown request error',
        });

        return throwError(() => error);
      }),
    );
  }

  private getPayload(request: AuditedRequest): Record<string, unknown> {
    return {
      params: request.params,
      query: request.query,
      body: request.body as Record<string, unknown>,
    };
  }
}
