import {H9SmhLogMonitor} from './h9-smh-log-monitor.js'
import {Api} from './api/api.js'
import {defaultLogger} from './logging/logger.js'
import {Container} from './container/container.js'
import {LogObserver} from './log-observer.js'

const { default: packageJson } = await import('../package.json', { assert: { type: 'json' } })

process.on('unhandledRejection', (err: Error) => defaultLogger.error(err))
process.on('uncaughtException', (err: Error) => defaultLogger.error(err))

defaultLogger.info(`H9-SMH-Monitor ${packageJson.version}`)

const container = Container
  .make()
  .addService(LogObserver)
  .addService(H9SmhLogMonitor)
  .addService(Api)

process.on('SIGINT', async () => {
  defaultLogger.info('Received SIGINT, shutting down ..')
  await container.shutdown()
  process.exit()
})

await container.startup()
