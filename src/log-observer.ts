import { Tail } from 'tail'
import {filter, map, Observable, share, Subject} from 'rxjs'
import {LogLine} from './types/log-line.js'
import {mapToLogLine} from './log-line-mapper.js'
import {Service} from './container/service.js'
import {logFilePath} from './config/config.js'
import {Initializable} from './container/initializable.js'

export class LogObserver implements Service, Initializable {
  public static make(): LogObserver {
    return new LogObserver(logFilePath)
  }

  public readonly logLines: Observable<LogLine>
  private tail?: Tail
  private readonly logLinesSubject: Subject<string> = new Subject()

  private constructor(private readonly logFilePath: string) {
    this.logLines = this.logLinesSubject.pipe(
      map(mapToLogLine),
      filter((logLine): logLine is LogLine => logLine !== undefined),
      share(),
    )
  }

  public async startup() {
    this.tail = new Tail(this.logFilePath, { fromBeginning: true })
    this.tail.on('line', this.logLinesSubject.next.bind(this.logLinesSubject))
  }

  public async shutdown() {
    if (this.tail !== undefined) {
      this.tail.unwatch()
      this.tail = undefined
    }
  }
}
