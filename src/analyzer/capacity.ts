import {distinctUntilChanged, filter, map, Observable} from 'rxjs'
import {LogLine} from '../types/log-line.js'

const capacityRegex = /^msg="new mining info" capacity="([ .\w]+)"/
export function mapToCapacity(logLines$: Observable<LogLine>): Observable<string> {
  return logLines$.pipe(
    map((logLine): string|undefined => {
      const matches = logLine.message.match(capacityRegex)
      if (matches === null || matches.length !== 2) {
        return
      }

      return matches[1]
    }),
    filter((capacity): capacity is string => capacity !== undefined),
    distinctUntilChanged(),
  )
}
