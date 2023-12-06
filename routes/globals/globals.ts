export const networkResponse = (status: 'success' | 'error' | 'test', data: any): string => {
  return JSON.stringify({ status, data })
}
