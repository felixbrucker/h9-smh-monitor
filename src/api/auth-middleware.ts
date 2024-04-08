import {Socket} from 'socket.io'

export function makeAuthMiddleware(token: string) {
  return (socket: Socket, next: (err?: Error) => void) => {
    const clientToken = socket.handshake.auth.token
    if (clientToken === undefined || token !== clientToken) {
      next(new Error('Unauthorized'))

      return
    }
    next()
  }
}
