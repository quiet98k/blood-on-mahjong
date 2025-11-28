import { defineEventHandler } from 'h3'

export default defineEventHandler((event) => {
  const req = (event.node as any)?.req
  const url = req?.url ?? '/' 
  const method = req?.method ?? 'GET'
  console.log(`[request] ${new Date().toISOString()} ${method} ${url}`)
})
