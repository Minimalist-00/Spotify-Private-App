// Axiosエラー型を具体的に定義
interface AxiosErrorResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

// Axiosエラー型
interface AxiosError<T = unknown> extends Error {
  config: unknown;
  code?: string;
  request?: unknown;
  response?: AxiosErrorResponse<T>;
  isAxiosError: boolean;
  toJSON: () => object;
}