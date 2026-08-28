import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface APIRequestOptions {
  readonly headers?: Readonly<Record<string, string>>;
  readonly params?: Readonly<Record<string, string | number | boolean>>;
}

export interface APIWriteOptions extends APIRequestOptions {
  readonly data?: unknown;
}

export class APIHelper {
  public constructor(private readonly request: APIRequestContext) {}

  public async get<TResponse>(url: string, options: APIRequestOptions = {}): Promise<TResponse> {
    return this.parse<TResponse>(await this.request.get(url, options));
  }

  public async post<TResponse>(url: string, options: APIWriteOptions = {}): Promise<TResponse> {
    return this.parse<TResponse>(await this.request.post(url, options));
  }

  public async put<TResponse>(url: string, options: APIWriteOptions = {}): Promise<TResponse> {
    return this.parse<TResponse>(await this.request.put(url, options));
  }

  public async delete<TResponse>(url: string, options: APIWriteOptions = {}): Promise<TResponse> {
    return this.parse<TResponse>(await this.request.delete(url, options));
  }

  private async parse<TResponse>(response: APIResponse): Promise<TResponse> {
    if (!response.ok()) {
      throw new Error(`Yêu cầu API thất bại với mã trạng thái ${String(response.status())}`);
    }

    return (await response.json()) as TResponse;
  }
}
