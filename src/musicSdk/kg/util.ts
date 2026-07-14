import { toMD5 } from '../crypto-shim'
import { httpFetch } from '../request'

export const signatureParams = (params: string, platform = 'android', body = ''): string => {
  let keyparam = 'OIlwieks28dk2k092lksi2UIkp'
  if (platform === 'web') keyparam = 'NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt'
  const param_list = params.split('&')
  param_list.sort()
  const sign_params = `${keyparam}${param_list.join('')}${body}${keyparam}`
  return toMD5(sign_params)
}

export const createHttpFetch = async (url: string, options: any, retryNum = 0): Promise<any> => {
  if (retryNum > 2) throw new Error('try max num')
  let result: any
  try {
    result = await httpFetch(url, options).promise
  } catch (err) {
    console.log(err)
    return createHttpFetch(url, options, ++retryNum)
  }
  if (result.statusCode !== 200 ||
    (
      result.body.error_code ??
      result.body.errcode ??
      result.body.err_code) != 0
  ) return createHttpFetch(url, options, ++retryNum)
  if (result.body.data) return result.body.data
  if (Array.isArray(result.body.info)) return result.body
  return result.body.info
}
