import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

interface HttpResponse {
  status(code: number): HttpResponse;
  json(body: unknown): void;
}

interface HttpRequest {
  readonly url: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponse>();
    const request = context.getRequest<HttpRequest>();
    const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      instance: request.url,
      status,
      title: this.title(error),
      traceId: randomUUID(),
      type: error instanceof Error ? error.name : 'InternalServerError',
    });
  }

  private title(error: unknown): string {
    if (!(error instanceof HttpException)) {
      return 'Backend не смог выполнить запрос.';
    }

    const response = error.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    const message = Reflect.get(response, 'message');

    return Array.isArray(message) ? message.join('; ') : String(message ?? error.message);
  }
}
