import {filter, map, Observable, share} from 'rxjs'
import {LogLine} from '../types/log-line.js'

interface PlottingEndInfo {
  nodeId: string
  path: string
  numUnits: number
  commitmentAtxId: string
  durationFormatted: string
}

const plottingEndRegex = /^msg="Plot completed" CommitmentAtxId=(\w+) ID=(\w+) LabelsPerUnit=(\d+) NumUnits=(\d+) Path="?(.+)[/|\\]post_\w+"? duration="?([\w:]+)"?$/
export function mapToPlottingEnd(logLines$: Observable<LogLine>): Observable<PlottingEndInfo> {
  return logLines$.pipe(
    map((logLine): PlottingEndInfo|undefined => {
      const matches = logLine.message.match(plottingEndRegex)
      if (matches === null || matches.length !== 7) {
        return
      }

      return {
        nodeId: matches[2],
        path: matches[5],
        numUnits: parseInt(matches[4], 10),
        commitmentAtxId: matches[1],
        durationFormatted: matches[6],
      }
    }),
    filter((endInfo): endInfo is PlottingEndInfo => endInfo !== undefined),
    share(),
  )
}
