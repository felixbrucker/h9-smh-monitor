import {LogObserver} from './log-observer.js'
import {BehaviorSubject, filter, Observable, Subscription} from 'rxjs'
import {detectStartupInfo, StartupInfo} from './analyzer/startup-info.js'
import {mapToPlottingStatus, PlottingStatus} from './analyzer/plotting-status.js'
import {Service} from './container/service.js'
import {Container} from './container/container.js'
import {Initializable} from './container/initializable.js'
import {mapToCapacity} from './analyzer/capacity.js'
import {mapToRoundInfo, RoundInfo} from './analyzer/round-info.js'
import {mapToActiveInitProofs} from './analyzer/active-init-proofs.js'
import {ActiveProof, mapToActiveProofs} from './analyzer/active-proof-reading.js'

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

  public get capacity(): string|undefined {
    return this.capacitySubject.getValue()
  }

  public get roundInfo(): RoundInfo|undefined {
    return this.roundInfoSubject.getValue()
  }

  public get activeInitProofs(): Map<string, ActiveProof> {
    return this.activeInitProofsSubject.getValue()
  }

  public get activeProofs(): Map<string, ActiveProof> {
    return this.activeProofsSubject.getValue()
  }

  public readonly startupInfo$: Observable<StartupInfo>
  public readonly plottingStatus$: Observable<Map<string, PlottingStatus>>
  public readonly activeInitProofs$: Observable<Map<string, ActiveProof>>
  public readonly activeProofs$: Observable<Map<string, ActiveProof>>
  public readonly capacity$: Observable<string>
  public readonly roundInfo$: Observable<RoundInfo>
  private readonly startupInfoSubject: BehaviorSubject<StartupInfo|undefined> = new BehaviorSubject<StartupInfo|undefined>(undefined)
  private readonly plottingStatusSubject: BehaviorSubject<Map<string, PlottingStatus>> = new BehaviorSubject<Map<string, PlottingStatus>>(new Map())
  private readonly capacitySubject: BehaviorSubject<string|undefined> = new BehaviorSubject<string|undefined>(undefined)
  private readonly roundInfoSubject: BehaviorSubject<RoundInfo|undefined> = new BehaviorSubject<RoundInfo|undefined>(undefined)
  private readonly activeInitProofsSubject: BehaviorSubject<Map<string, ActiveProof>> = new BehaviorSubject<Map<string, ActiveProof>>(new Map())
  private readonly activeProofsSubject: BehaviorSubject<Map<string, ActiveProof>> = new BehaviorSubject<Map<string, ActiveProof>>(new Map())
  private readonly subscriptions: Subscription[]

  private constructor(private readonly logObserver: LogObserver) {
    this.startupInfo$ = this.startupInfoSubject.pipe(filter((startupInfo): startupInfo is StartupInfo => startupInfo !== undefined))
    this.capacity$ = this.capacitySubject.pipe(filter((capacity): capacity is string => capacity !== undefined))
    this.roundInfo$ = this.roundInfoSubject.pipe(filter((postRoundInfo): postRoundInfo is RoundInfo => postRoundInfo !== undefined))
    this.plottingStatus$ = this.plottingStatusSubject.asObservable()
    this.activeInitProofs$ = this.activeInitProofsSubject.asObservable()
    this.activeProofs$ = this.activeProofsSubject.asObservable()
    this.subscriptions = [
      detectStartupInfo(this.logObserver.logLines).subscribe(this.startupInfoSubject),
      mapToPlottingStatus(this.logObserver.logLines).subscribe(this.plottingStatusSubject),
      mapToCapacity(this.logObserver.logLines).subscribe(this.capacitySubject),
      mapToRoundInfo(this.logObserver.logLines).subscribe(this.roundInfoSubject),
      mapToActiveInitProofs(this.logObserver.logLines).subscribe(this.activeInitProofsSubject),
      mapToActiveProofs(this.logObserver.logLines).subscribe(this.activeProofsSubject),
    ]
  }

  public async startup() {}

  public async shutdown() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe())
  }
}
