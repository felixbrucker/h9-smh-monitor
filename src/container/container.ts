import {ServiceBuilder} from './service-builder.js'
import {Initializable, isInitializable} from './initializable.js'
import {InitializableService, Service} from './service.js'
import {ServiceIdentifier} from './service-identifier.js'

export class Container implements Initializable {
  public static make(): Container {
    return new Container()
  }

  private get uniqueServices(): Service[] {
    return [...new Set(Array.from(this.services.values()))]
  }

  private readonly services: Map<string, Service> = new Map<string, Service>()
  private readonly initializableServices: Map<string, InitializableService> = new Map<string, InitializableService>()

  public getTaggedServices<T extends Service>(tag: string): T[] {
    return this.uniqueServices.filter(service => (service.tags ?? []).indexOf(tag) !== -1) as T[]
  }

  public getServiceForName<T extends Service>(name: string): T {
    const service = this.services.get(name)
    if (service === undefined) {
      throw new Error(`Service "${name}" does not exist`)
    }

    return service as T
  }

  public getService<T extends Service>(serviceIdentifier: ServiceIdentifier<T>): T {
    return this.getServiceForName(serviceIdentifier.name)
  }

  public getOptionalService<T extends Service>(serviceIdentifier: ServiceIdentifier<T>): T|undefined {
    return this.services.get(serviceIdentifier.name) as T|undefined
  }

  public addService(serviceBuilder: ServiceBuilder): Container {
    const service = serviceBuilder.make(this)
    this.addConfiguredService(service)

    return this
  }

  public addConfiguredService(service: Service): Container {
    this.services.set(service.constructor.name, service)
    if (service.aliases !== undefined) {
      service.aliases.forEach(alias => this.services.set(alias, service))
    }
    if (isInitializable(service)) {
      this.initializableServices.set(service.constructor.name, service)
    }

    return this
  }

  public async startup(): Promise<void> {
    for (const service of Array.from(this.initializableServices.values())) {
      await service.startup()
    }
  }

  public async shutdown(): Promise<void> {
    for (const service of Array.from(this.initializableServices.values()).reverse()) {
      await service.shutdown()
    }
  }
}
