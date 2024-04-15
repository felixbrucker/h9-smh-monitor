import {Subscription} from 'rxjs'
import {H9SmhLogMonitor} from '../h9-smh-log-monitor.js'
import {Service} from '../container/service.js'
import {Initializable} from '../container/initializable.js'
import {Container} from '../container/container.js'
import {apiListenHost, apiListenPort, authToken} from '../config/config.js'
import {ILogObj, Logger} from 'tslog'
import {makeLogger} from '../logging/logger.js'
import {createServer, Server as HttpServer} from 'http'
import {Server as SocketIoServer, Socket} from 'socket.io'
import {makeAuthMiddleware} from './auth-middleware.js'
import {StartupInfo} from '../analyzer/startup-info.js'
import {PlottingStatus} from '../analyzer/plotting-status.js'
import {RoundInfo} from '../analyzer/round-info.js'
import {ActiveInitProof} from '../analyzer/active-init-proofs.js'

interface ClientToServerEvents {}

interface ServerToClientEvents {
  'startup-info': (startupInfo: StartupInfo) => void
  'plotting-status': (plottingStatus: Record<string, PlottingStatus>) => void
  'capacity': (capacity: string) => void
  'post-round-info': (postRoundInfo: RoundInfo) => void
  'active-init-proofs': (activeInitProofs: Record<string, ActiveInitProof>) => void
}

export class Api implements Service, Initializable {
  public static make(container: Container): Api {
    return new Api(container.getService(H9SmhLogMonitor))
  }

  private readonly subscriptions: Subscription[]
  private readonly httpServer: HttpServer = createServer()
  private readonly socketIoServer: SocketIoServer = new SocketIoServer(this.httpServer, { transports: ['websocket'] })
  private readonly logger: Logger<ILogObj> = makeLogger({ name: 'Api' })
  private readonly sockets: Map<string, Socket<ClientToServerEvents, ServerToClientEvents>> = new Map<string, Socket>()

  private constructor(private readonly h9SmhLogMonitor: H9SmhLogMonitor) {
    this.socketIoServer.use(makeAuthMiddleware(authToken))
    this.socketIoServer.on('connection', this.onConnection.bind(this))
    this.subscriptions = [
      this.h9SmhLogMonitor.startupInfo$.subscribe(startupInfo => {
        this.sockets.forEach(socket => socket.emit('startup-info', startupInfo))
      }),
      this.h9SmhLogMonitor.plottingStatus$.subscribe(plottingStatus => {
        this.sockets.forEach(socket => socket.emit('plotting-status', Object.fromEntries(plottingStatus)))
      }),
      this.h9SmhLogMonitor.capacity$.subscribe(capacity => {
        this.sockets.forEach(socket => socket.emit('capacity', capacity))
      }),
      this.h9SmhLogMonitor.roundInfo$.subscribe(postRoundInfo => {
        this.sockets.forEach(socket => socket.emit('post-round-info', postRoundInfo))
      }),
      this.h9SmhLogMonitor.activeInitProofs$.subscribe(activeInitProofs => {
        this.sockets.forEach(socket => socket.emit('active-init-proofs', Object.fromEntries(activeInitProofs)))
      }),
    ]
  }

  public async startup() {
    await new Promise<void>(resolve => this.httpServer.listen({ host: apiListenHost, port: apiListenPort }, resolve))
    this.logger.info(`Initialized | Listening on ws://${apiListenHost}:${apiListenPort}`)
  }

  public async shutdown() {
    this.httpServer.close()
    this.subscriptions.forEach(subscription => subscription.unsubscribe())
  }

  private async onConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
    this.logger.debug(`Client ${socket.id} connected`)
    this.sockets.set(socket.id, socket)
    socket.on('disconnect', () => {
      this.sockets.delete(socket.id)
      this.logger.debug(`Client ${socket.id} disconnected`)
    })

    if (this.h9SmhLogMonitor.startupInfo !== undefined) {
      socket.emit('startup-info', this.h9SmhLogMonitor.startupInfo)
    }
    socket.emit('plotting-status', Object.fromEntries(this.h9SmhLogMonitor.plottingStatus))
    if (this.h9SmhLogMonitor.capacity !== undefined) {
      socket.emit('capacity', this.h9SmhLogMonitor.capacity)
    }
    if (this.h9SmhLogMonitor.roundInfo !== undefined) {
      socket.emit('post-round-info', this.h9SmhLogMonitor.roundInfo)
    }
    socket.emit('active-init-proofs', Object.fromEntries(this.h9SmhLogMonitor.activeInitProofs))
  }
}
