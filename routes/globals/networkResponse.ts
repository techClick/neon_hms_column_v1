export const networkResponse = (status: 'success' | 'error', data: any): string => {
  return JSON.stringify({ status, data })
}
