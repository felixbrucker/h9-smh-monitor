import {Service} from './service.js'

export interface Initializable {
  startup(): Promise<void>
  shutdown(): Promise<void>
}

export function isInitializable(service: Service): service is Initializable {
  return typeof service.startup === 'function' && typeof service.shutdown === 'function'
}
