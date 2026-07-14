import { httpFetch } from '../../request'
import { weapi, linuxapi, eapi } from './crypto'

function toFormBody(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

export const weapiRequest = async (url: string, data: any): Promise<any> => {
  const encrypted = weapi(data)
  const body = toFormBody({ params: encrypted.params, encSecKey: encrypted.encSecKey })

  const resp = await httpFetch(`https://music.163.com/weapi${url}`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: 'https://music.163.com/',
    },
    body,
  }).promise

  return resp.body
}

export const linuxapiRequest = async (url: string, data: any): Promise<any> => {
  const encrypted = linuxapi(data)
  const body = toFormBody({ parameter: encrypted })

  const resp = await httpFetch(url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: 'https://music.163.com/',
    },
    body,
  }).promise

  return resp.body
}

export const eapiRequest = async (url: string, data: any): Promise<any> => {
  const encrypted = eapi(url, data)
  const body = toFormBody({ params: encrypted })

  const resp = await httpFetch(`https://interface.music.163.com/eapi/batch`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: 'https://music.163.com/',
    },
    body,
  }).promise

  return resp.body
}
