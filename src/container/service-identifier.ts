import {ServiceBuilder} from './service-builder.js'
import {Service} from './service.js'
import {Named} from './named.js'
import {Constructor} from './constructor.js'

export type ServiceIdentifier<T extends Service> = Named | Constructor<T> | ServiceBuilder<T>
