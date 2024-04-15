import {combineLatest, distinctUntilChanged, filter, map, Observable} from 'rxjs'
import {LogLine} from '../types/log-line.js'
import dayjs from 'dayjs'

export interface RoundInfo {
  isRunning: boolean
  startDate: Date
  endDate: Date
}

const postRoundInfoRegex = /^msg="PoST Status" End="([0-9-]+ [0-9:]+)" Running=(\w+) Start="([0-9-]+ [0-9:]+)"$/
function mapToPostRoundInfo(logLines$: Observable<LogLine>): Observable<RoundInfo> {
  return logLines$.pipe(
    map((logLine): RoundInfo|undefined => {
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
    filter((postRoundInfo): postRoundInfo is RoundInfo => postRoundInfo !== undefined),
    distinctUntilChanged((prev, curr) =>
      prev.isRunning === curr.isRunning
      && prev.endDate.getTime() === curr.endDate.getTime()
      && prev.startDate.getTime() === curr.startDate.getTime()
    ),
  )
}

const poetPostRoundInfoRegex = /^msg="PoET\(PoST\) Status" End="([0-9-]+ [0-9:]+)" Running=(\w+) Start="([0-9-]+ [0-9:]+)"$/
function mapToPoetPostRoundInfo(logLines$: Observable<LogLine>): Observable<RoundInfo> {
  return logLines$.pipe(
    map((logLine): RoundInfo|undefined => {
      const matches = logLine.message.match(poetPostRoundInfoRegex)
      if (matches === null || matches.length !== 4) {
        return
      }

      return {
        isRunning: matches[2] === 'true',
        startDate: dayjs(matches[3]).toDate(),
        endDate: dayjs(matches[1]).toDate(),
      }
    }),
    filter((postRoundInfo): postRoundInfo is RoundInfo => postRoundInfo !== undefined),
    distinctUntilChanged((prev, curr) =>
      prev.isRunning === curr.isRunning
      && prev.endDate.getTime() === curr.endDate.getTime()
      && prev.startDate.getTime() === curr.startDate.getTime()
    ),
  )
}

export function mapToRoundInfo(logLines$: Observable<LogLine>): Observable<RoundInfo> {
  return combineLatest([
    mapToPostRoundInfo(logLines$),
    mapToPoetPostRoundInfo(logLines$),
  ]).pipe(map(([postRoundInfo, poetPostRoundInfo]) => {
    if (poetPostRoundInfo.isRunning) {
      return poetPostRoundInfo
    }

    return postRoundInfo
  }))
}
