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
  addHeaders?: any
}

export const callEndpoint = async ({
  api, body, type = 'text', method = 'GET', contentType, noStringify, noContentType, auth, addHeaders
}: CallArgs): Promise<IResponse> => {
  const options: any = {
    method,
    headers: {
      'Content-Type': contentType ?? 'application/json',
      Authorization: auth,
      accept: 'application/json',
      ...addHeaders,
      body: JSON.stringify(body)
    },
    body: !noStringify ? JSON.stringify(body) : body
  }
  if (noContentType) delete options.headers['Content-Type']
  try {
    // console.log('calling ..... ', `${api}`)
    const response = await fetch(
      `${api}`,
      options
    )

    // console.log('response', response)
    if (!response) {
      return { status: 'error', data: 'Internet connection is not detected' } as IResponse
    }

    let dataFromEndPoint: any = JSON.stringify(
      { status: 'error', data: 'Error connecting with server. Please try again' }
    )
    if (type === 'text') {
      const dataFromEndPoint1 = await response.text()
      dataFromEndPoint = dataFromEndPoint1 || dataFromEndPoint
    }
    return JSON.parse(JSON.stringify({ status: 'success', data: dataFromEndPoint })) as IResponse
  } catch (e: any) {
    return { status: 'Server error', data: e.message } as IResponse
  }
}
