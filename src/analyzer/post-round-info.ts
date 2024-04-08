import {distinctUntilChanged, filter, map, Observable} from 'rxjs'
import {LogLine} from '../types/log-line.js'
import dayjs from 'dayjs'

export interface PostRoundInfo {
  isRunning: boolean
  startDate: Date
  endDate: Date
}

const postRoundInfoRegex = /^msg="PoST Status" End="([0-9-]+ [0-9:]+)" Running=(\w+) Start="([0-9-]+ [0-9:]+)"$/
export function mapToPostRoundInfo(logLines$: Observable<LogLine>): Observable<PostRoundInfo> {
  return logLines$.pipe(
    map((logLine): PostRoundInfo|undefined => {
      const matches = logLine.message.match(postRoundInfoRegex)
      if (matches === null || matches.length !== 4) {
        return
      }

      return {
        isRunning: matches[2] === 'true',
        startDate: dayjs(matches[3]).toDate(),
        endDate: dayjs(matches[1]).toDate(),
      }
    }),
    filter((postRoundInfo): postRoundInfo is PostRoundInfo => postRoundInfo !== undefined),
    distinctUntilChanged((prev, curr) =>
      prev.isRunning === curr.isRunning
      && prev.endDate.getTime() === curr.endDate.getTime()
      && prev.startDate.getTime() === curr.startDate.getTime()
    ),
  )
}
