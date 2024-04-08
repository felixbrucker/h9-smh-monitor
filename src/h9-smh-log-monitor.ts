import {LogObserver} from './log-observer.js'
import {BehaviorSubject, filter, Observable, Subscription} from 'rxjs'
import {detectStartupInfo, StartupInfo} from './analyzer/startup-info.js'
import {mapToPlottingStatus, PlottingStatus} from './analyzer/plotting-status.js'
import {Service} from './container/service.js'
import {Container} from './container/container.js'
import {Initializable} from './container/initializable.js'

export class H9SmhLogMonitor implements Service, Initializable {
  public static make(container: Container): H9SmhLogMonitor {
    return new H9SmhLogMonitor(container.getService(LogObserver))
  }

  public get startupInfo(): StartupInfo|undefined {
    return this.startupInfoSubject.getValue()
  }

  public get plottingStatus(): Map<string, PlottingStatus> {
    return this.plottingStatusSubject.getValue()
  }

  public readonly startupInfo$: Observable<StartupInfo>
  public readonly plottingStatus$: Observable<Map<string, PlottingStatus>>
  private readonly startupInfoSubject: BehaviorSubject<StartupInfo|undefined> = new BehaviorSubject<StartupInfo|undefined>(undefined)
  private readonly plottingStatusSubject: BehaviorSubject<Map<string, PlottingStatus>> = new BehaviorSubject<Map<string, PlottingStatus>>(new Map())
  private readonly subscriptions: Subscription[]

  private constructor(private readonly logObserver: LogObserver) {
    this.startupInfo$ = this.startupInfoSubject.pipe(filter((startupInfo): startupInfo is StartupInfo => startupInfo !== undefined))
    this.plottingStatus$ = this.plottingStatusSubject.asObservable()
    this.subscriptions = [
      detectStartupInfo(this.logObserver.logLines).subscribe(this.startupInfoSubject),
      mapToPlottingStatus(this.logObserver.logLines).subscribe(this.plottingStatusSubject),
    ]
  }

  public async startup() {}

  public async shutdown() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe())
  }
}
