import {
  merge,
  filter,
  map,
  Observable,
  scan,
  distinctUntilChanged,
  combineLatestWith,
  startWith,
  withLatestFrom, shareReplay
} from 'rxjs'
import {LogLine} from '../types/log-line.js'
import {mapToRoundInfo} from './round-info.js'

interface LoadingCompleted {
  count: number
  path: string
}

const loadingCompletedRegex = /^msg="Loading completed" count=(\d+) path="?(.+)"?$/
export function mapToLoadingCompleted(logLines$: Observable<LogLine>): Observable<LoadingCompleted> {
  return logLines$.pipe(
    map((logLine): LoadingCompleted|undefined => {
      const matches = logLine.message.match(loadingCompletedRegex)
      if (matches === null || matches.length !== 3) {
        return
      }

      return {
        count: parseInt(matches[1], 10),
        path: matches[2],
      }
    }),
    filter((info): info is LoadingCompleted => info !== undefined),
  )
}

interface PostSubmit {
  completed: number
  total: number
}

const postSubmitRegex = /^msg="Submit post success" nodeId=\w+ success=(\d+) total=(\d+)$/
export function mapToPostSubmit(logLines$: Observable<LogLine>): Observable<PostSubmit> {
  return logLines$.pipe(
    map((logLine): PostSubmit|undefined => {
      const matches = logLine.message.match(postSubmitRegex)
      if (matches === null || matches.length !== 3) {
        return
      }

      return {
        completed: parseInt(matches[1], 10),
        total: parseInt(matches[2], 10),
      }
    }),
    filter((info): info is PostSubmit => info !== undefined),
  )
}

export interface ScanProgress {
  completed: number
  total: number
}

export function mapToScanProgress(logLines$: Observable<LogLine>): Observable<ScanProgress> {
  const loadedPlots: Map<string, number> = new Map<string, number>()
  const totalPlots$ = mapToLoadingCompleted(logLines$).pipe(
    map(loadingCompleted => {
      loadedPlots.set(loadingCompleted.path, loadingCompleted.count)

      return Array.from(loadedPlots.values()).reduce((acc, curr) => acc + curr,0)
    }),
    distinctUntilChanged(),
  )
  const initialPostSubmit: PostSubmit = { completed: 0, total: 0 }
  const initialPostSubmit$: Observable<PostSubmit> = totalPlots$.pipe(
    map(totalPlots => ({
      completed: 0,
      total: totalPlots,
    })),
    shareReplay(1),
  )

  const scanProgressDueToRoundChange$ = mapToRoundInfo(logLines$).pipe(
    distinctUntilChanged((prev, curr) => prev.isRunning === curr.isRunning),
    withLatestFrom(initialPostSubmit$),
    map(([_, initialPostSubmit]) => initialPostSubmit),
  )

  const postSubmit$ = mapToPostSubmit(logLines$).pipe(
    startWith(initialPostSubmit),
    combineLatestWith(initialPostSubmit$),
    map(([postSubmit, initialPostSubmit]) => {
      if (postSubmit.total === 0) {
        return initialPostSubmit
      }

      return postSubmit
    }),
  )

  return merge(
    scanProgressDueToRoundChange$,
    postSubmit$,
  ).pipe(
    distinctUntilChanged((prev, curr) => prev.total === curr.total && prev.completed === curr.completed),
  )
}
