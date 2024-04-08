import {LogLine} from '../types/log-line.js'
import {filter, map, Observable, share} from 'rxjs'


export interface PlottingProgress {
  nodeId: string
  path: string
  speedInMibPerSec: number
  speedFormatted: string
  currentFile: {
    number: number
    progress: number
  }
  totalFiles: {
    number: number
    progress: number
  }
}



const plottingProgressRegex = /^Speed:\[([^\]]+)]\s+Progress:\[([\d.]+)%]\s+File:\[(\d+)\/(\d+)]\s+Wait:\[\d+]\s+Path:\[([\w\\/]+)[/|\\]post_(\w+)]$/
export function mapToPlottingProgress(logLines$: Observable<LogLine>): Observable<PlottingProgress> {
  return logLines$.pipe(
    map((logLine): PlottingProgress|undefined => {
      const matches = logLine.message.match(plottingProgressRegex)
      if (matches === null || matches.length !== 7) {
        return
      }
      const nodeId = matches[6]
      const completedFiles = parseInt(matches[3], 10)
      const totalFiles = parseInt(matches[4], 10)
      const currentFileProgress = parseFloat(matches[2]) / 100
      const fileProgress = completedFiles / totalFiles
      const totalProgress = fileProgress + ((1 / totalFiles) * currentFileProgress)
      const speedFormatted = matches[1]
      const speedInMibPerSec = mapSpeedStringToMibPerSecond(speedFormatted)

      return {
        path: matches[5],
        nodeId,
        speedInMibPerSec,
        speedFormatted,
        currentFile: {
          number: completedFiles + 1,
          progress: currentFileProgress,
        },
        totalFiles: {
          number: totalFiles,
          progress: totalProgress,
        },
      }
    }),
    filter((plottingProgress): plottingProgress is PlottingProgress => plottingProgress !== undefined),
    share(),
  )
}

function mapSpeedStringToMibPerSecond(speed: string): number {
  const parts = speed.split(' ')
  const speedInUnits = parseFloat(parts[0])
  const factor = getSpeedUnitFactorForMibPerSec(parts[1])

  return speedInUnits * factor
}

function getSpeedUnitFactorForMibPerSec(speedUnit: string): number {
  switch (speedUnit) {
    case 'B/s': return 1 / 1024 / 1024
    case 'KiB/s': return 1 / 1024
    case 'MiB/s': return 1
    case 'GiB/s': return 1024
    default: return 0
  }
}
