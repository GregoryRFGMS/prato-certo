const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}
export async function api(path: string, method = 'GET', body?: unknown) {
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    response = await fetch(base + path, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      'Não foi possível conectar ao serviço de contas. Tente novamente mais tarde.',
    );
  } finally {
    clearTimeout(timeout);
  }
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new ApiError(
      'O serviço de contas ainda não está conectado nesta versão. Você pode explorar a demonstração.',
    );
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      typeof data.detail === 'string' ? data.detail : 'Confira os campos e tente novamente.',
      response.status,
    );
  return data;
}
