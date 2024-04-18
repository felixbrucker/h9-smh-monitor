import {filter, map, Observable, share} from 'rxjs'
import {LogLine} from '../types/log-line.js'

export interface PlottingStartInfo {
  nodeId: string
  path: string
  numUnits: number
}

const plottingStartRegex = /^msg="(?:Start plot|Continue plot)" ID=(\w+) LabelsPerUnit=(\d+) NumUnits=(\d+) Path="?(.+)[/|\\]post_/
export function mapToPlottingStart(logLines$: Observable<LogLine>): Observable<PlottingStartInfo> {
  return logLines$.pipe(
    map((logLine): PlottingStartInfo|undefined => {
      const matches = logLine.message.match(plottingStartRegex)
      if (matches === null || matches.length !== 5) {
        return
      }

      return {
        nodeId: matches[1],
        path: matches[4],
        numUnits: parseInt(matches[3], 10),
      }
    }),
    filter((startInfo): startInfo is PlottingStartInfo => startInfo !== undefined),
    share(),
  )
}
