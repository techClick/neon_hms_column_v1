export type IResponse = {
  status: 'error' | 'success' | 'Server error'
  data?: any
  description?: string
}

export type CallArgs = {
  api: string
  noStatus?: boolean
  method?: string
  body?: any
  type?: 'json' | 'blob' | 'text'
  token?: string
  VerifyToken?: string
  isUnAuthed?: boolean
  noStringify?: boolean
  noContentType?: boolean
  contentType?: any
  auth?: string
  addHeaders?: Record<string, any>
}

const { CX_URL: cxUrl, CX_API_KEY: apiKey } = process.env

export const callCXEndpoint = async ({
  api, body, type = 'json', method = 'GET', contentType, noStringify, noContentType, auth
}: CallArgs): Promise<IResponse> => {
  const options: any = {
    method,
    headers: {
      'Content-Type': contentType ?? 'application/json',
      body: JSON.stringify(body),
      'user-api-key': apiKey,
      Host: 'staging.channex.io'
    },
    body: !noStringify ? JSON.stringify(body) : body
  }

  if (noContentType) delete options.headers['Content-Type']
  try {
    // console.log('calling ..... ', `${cxUrl}${api}`)
    const response = await fetch(
      `${cxUrl}${api}`,
      options
    )

    // console.log('response', response);
    if (!response) {
      return { status: 'error', data: 'Internet connection is not detected' } as IResponse
    }

    let dataFromEndPoint: any = JSON.stringify(
      { status: 'error', data: 'Error connecting with server. Please try again' }
    )
    if (type === 'text') {
      const dataFromEndPoint1 = await response.text()
      dataFromEndPoint = dataFromEndPoint1 || dataFromEndPoint
    } else if (type === 'json') {
      const dataFromEndPoint1 = await response.json()
      dataFromEndPoint = dataFromEndPoint1 || dataFromEndPoint
    }
    return JSON.parse(JSON.stringify({ status: 'success', data: dataFromEndPoint })) as IResponse
  } catch (e: any) {
    return { status: 'Server error', data: e.message } as IResponse
  }
}
