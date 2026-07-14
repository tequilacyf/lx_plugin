import { httpFetch } from '../../request'

export const createHttpFetch = async (url: string, options: any, retryNum = 0): Promise<any> => {
  if (retryNum > 2) throw new Error('try max num')

  let result: any
  try {
    result = await httpFetch(url, options).promise
  } catch (err) {
    return createHttpFetch(url, options, ++retryNum)
  }

  if (result.statusCode !== 200) {
    return createHttpFetch(url, options, ++retryNum)
  }

  const code = result.body.code ?? result.body.returnCode
  if (code !== undefined && code !== '000000' && code !== 0 && code !== '0' && code !== '200') {
    return createHttpFetch(url, options, ++retryNum)
  }

  return result.body
}
