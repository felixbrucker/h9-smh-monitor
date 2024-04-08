import {Service} from './service.js'
import {Container} from './container.js'
import {Named} from './named.js'

export interface ServiceBuilder<T extends Service = Service> extends Named {
  make(container?: Container): T
}
