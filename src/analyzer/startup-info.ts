import {LogLine, LogTag} from '../types/log-line.js'
import {combineLatest, filter, map, Observable, share} from 'rxjs'


export interface StartupInfo {
  version: string
  minerName: string
  plotPaths: number
  postRsVersion: string
  cpu: string
}

export function detectStartupInfo(logLines$: Observable<LogLine>): Observable<StartupInfo> {
  return combineLatest([
    mapToVersion(logLines$),
    mapToMinerName(logLines$),
    mapToPlotPathCount(logLines$),
    mapToPostRsVersion(logLines$),
    mapToCpuInfo(logLines$),
  ]).pipe(
    map(([version, minerName, plotPathCount, postRsVersion, cpuInfo]) => ({
      version,
      minerName,
      plotPaths: plotPathCount,
      postRsVersion,
      cpu: cpuInfo,
    }))
  )
}

function filterStartupKeyValuePairs(logLines$: Observable<LogLine>): Observable<{ key: string, value: string }> {
  return logLines$.pipe(
    filter(logLines => logLines.tag === LogTag.startup),
    map(logLine => {
      const parts = logLine.message.split(':')

      return {
        key: parts[0],
        value: parts.slice(1).join(':'),
      }
    }),
    share(),
  )
}

function mapToVersion(logLines$: Observable<LogLine>): Observable<string> {
  return filterStartupKeyValuePairs(logLines$).pipe(
    filter(info => info.key === 'Version'),
    map(info => info.value),
  )
}

function mapToMinerName(logLines$: Observable<LogLine>): Observable<string> {
  return filterStartupKeyValuePairs(logLines$).pipe(
    filter(info => info.key === 'MinerName'),
    map(info => info.value),
  )
}

function mapToPlotPathCount(logLines$: Observable<LogLine>): Observable<number> {
  return filterStartupKeyValuePairs(logLines$).pipe(
    filter(info => info.key === 'Path count'),
    map(info => parseInt(info.value, 10)),
  )
}

const postRsVersionRegex = /^msg=post-rs version=post-rs-([0-9.-]+)$/
function mapToPostRsVersion(logLines$: Observable<LogLine>): Observable<string> {
  return logLines$.pipe(
    map(logLine => {
      const matches = logLine.message.match(postRsVersionRegex)
      if (matches === null || matches.length !== 2) {
        return
      }

      return matches[1]
    }),
    filter((version): version is string => version !== undefined),
  )
}

const cpuInfoRegex = /BrandName="([^"]+)"/
function mapToCpuInfo(logLines$: Observable<LogLine>): Observable<string> {
  return logLines$.pipe(
    map(logLine => {
      if (logLine.message.indexOf('msg="CPU Information"') === -1) {
        return
      }
      const matches = logLine.message.match(cpuInfoRegex)
      if (matches === null || matches.length !== 2) {
        return
      }

      return matches[1]
    }),
    filter((cpu): cpu is string => cpu !== undefined),
  )
}
