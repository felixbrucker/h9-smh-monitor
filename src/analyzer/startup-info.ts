import {LogLine, LogTag} from '../types/log-line.js'
import {combineLatest, distinctUntilChanged, filter, map, Observable, share} from 'rxjs'


export interface StartupInfo {
  version: string
  minerName: string
  plotPaths: number
  postRsVersion: string
  cpu: string
  threadConfig: ThreadConfig
}

export function detectStartupInfo(logLines$: Observable<LogLine>): Observable<StartupInfo> {
  return combineLatest([
    mapToVersion(logLines$),
    mapToMinerName(logLines$),
    mapToPlotPathCount(logLines$),
    mapToPostRsVersion(logLines$),
    mapToCpuInfo(logLines$),
    mapToThreadConfig(logLines$),
  ]).pipe(
    map(([version, minerName, plotPathCount, postRsVersion, cpuInfo, threadConfig]) => ({
      version,
      minerName,
      plotPaths: plotPathCount,
      postRsVersion,
      cpu: cpuInfo,
      threadConfig,
    })),
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
    distinctUntilChanged(),
  )
}

function mapToMinerName(logLines$: Observable<LogLine>): Observable<string> {
  return filterStartupKeyValuePairs(logLines$).pipe(
    filter(info => info.key === 'MinerName'),
    map(info => info.value),
    distinctUntilChanged(),
  )
}

function mapToPlotPathCount(logLines$: Observable<LogLine>): Observable<number> {
  return filterStartupKeyValuePairs(logLines$).pipe(
    filter(info => info.key === 'Path count'),
    map(info => parseInt(info.value, 10)),
    distinctUntilChanged(),
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
    distinctUntilChanged(),
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
    distinctUntilChanged(),
  )
}

interface ThreadConfig {
  nonces: number
  postThreads: number
  randomXThreads: number
}

const threadConfigRegex = /^msg="Thread configuration information" InitPoST=\w+ Nonces=(\d+) PoETServers="[[\w\]]+" PoETThread=\d+ PoSTAffinity=-?\d+ PoSTAffinityStep=\d+ PoSTCPUIds="[[\w\]]+" PoSTInstance=\d+ PoSTThread=(\d+) RandomXAffinity=-?\d+ RandomXAffinityStep=\d+ RandomXThread=(\d+)$/
function mapToThreadConfig(logLines$: Observable<LogLine>): Observable<ThreadConfig> {
  return logLines$.pipe(
    map((logLine): ThreadConfig|undefined => {
      const matches = logLine.message.match(threadConfigRegex)
      if (matches === null || matches.length !== 4) {
        return
      }

      return {
        nonces: parseInt(matches[1], 0),
        postThreads: parseInt(matches[2], 0),
        randomXThreads: parseInt(matches[3], 0),
      }
    }),
    filter((config): config is ThreadConfig => config !== undefined),
  )
}
