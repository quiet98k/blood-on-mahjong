import { initializeSocketIO } from '../utils/socket'
import type { Server as HTTPServer } from 'http'

let initialized = false

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    if (initialized) return
    
    // Get HTTP server from the request
    const req = event.node.req
    const socket = req.socket as any
    
    // Access the HTTP server
    if (socket && socket.server) {
      const server = socket.server as HTTPServer
      initializeSocketIO(server)
      initialized = true
      console.log('✅ Socket.IO initialized from Nitro plugin')
    }
  })
})
