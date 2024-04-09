import {LogLine} from '../types/log-line.js'
import {filter, map, merge, Observable, share, withLatestFrom} from 'rxjs'
import dayjs from 'dayjs'
import {mapToPlottingProgress, PlottingProgress} from './plotting-progress.js'
import {mapToPlottingStart, PlottingStartInfo} from './plotting-start.js'
import {mapToPlottingEnd} from './plotting-end.js'
import {makeLogger} from '../logging/logger.js'

export interface PlottingStatus extends PlottingProgress {
  numUnits: number
  currentFile: {
    number: number
    sizeInGib: number
    progress: number
    eta: Date
  }
  totalFiles: {
    number: number
    sizeInGib: number
    progress: number
    eta: Date
  }
}

const logger = makeLogger({ name: 'Plotting' })
export function mapToPlottingStatus(logLines$: Observable<LogLine>): Observable<Map<string, PlottingStatus>> {
  const _startedPlotsByNodeId: Map<string, PlottingStartInfo> = new Map<string, PlottingStartInfo>()
  const startedPlotsUpdateDueToStart$ = mapToPlottingStart(logLines$).pipe(map(plottingStart => {
    _startedPlotsByNodeId.set(plottingStart.nodeId, plottingStart)

    return _startedPlotsByNodeId
  }))
  const plottingEnd$ = mapToPlottingEnd(logLines$)
  const startedPlotsUpdateDueToEnd$ = plottingEnd$.pipe(map(plottingEnd => {
    _startedPlotsByNodeId.delete(plottingEnd.nodeId)

    return _startedPlotsByNodeId
  }))
  const startedPlotsByNodeId$ = merge(startedPlotsUpdateDueToStart$, startedPlotsUpdateDueToEnd$)

  const _activePlotsByNodeId: Map<string, PlottingStatus> = new Map<string, PlottingStatus>()
  const activePlotUpdatesDueToCompletion$ = plottingEnd$.pipe(map(plottingEnd => {
    const activePlot = _activePlotsByNodeId.get(plottingEnd.nodeId)
    if (activePlot !== undefined) {
      logger.info(`Finished plot ${activePlot.nodeId} (${activePlot.totalFiles.sizeInGib} GiB), took ${plottingEnd.durationFormatted}`)
    }
    _activePlotsByNodeId.delete(plottingEnd.nodeId)

    return _activePlotsByNodeId
  }))

  const activePlotUpdatesDueToProgress$ = mapToPlottingProgress(logLines$).pipe(
    withLatestFrom(startedPlotsByNodeId$),
    map(([plottingProgress, startedPlotsByNodeId]) => {
      let activePlotStatus = _activePlotsByNodeId.get(plottingProgress.nodeId)
      if (activePlotStatus === undefined) {
        const plottingStart = startedPlotsByNodeId.get(plottingProgress.nodeId)
        if (plottingStart === undefined) {
          return
        }
        const numUnits = plottingStart.numUnits
        const totalSizeInGib = numUnits * 64
        const fileSizeInGib = totalSizeInGib / plottingProgress.totalFiles.number

        activePlotStatus = {
          ...plottingProgress,
          numUnits,
          currentFile: {
            ...plottingProgress.currentFile,
            sizeInGib: fileSizeInGib,
            eta: getEta(fileSizeInGib, plottingProgress.currentFile.progress, plottingProgress.speedInMibPerSec),
          },
          totalFiles: {
            ...plottingProgress.totalFiles,
            sizeInGib: totalSizeInGib,
            eta: getEta(totalSizeInGib, plottingProgress.totalFiles.progress, plottingProgress.speedInMibPerSec),
          },
        }
      } else {
        activePlotStatus = {
          ...activePlotStatus,
          ...plottingProgress,
          currentFile: {
            ...activePlotStatus.currentFile,
            ...plottingProgress.currentFile,
            eta: getEta(activePlotStatus.currentFile.sizeInGib, plottingProgress.currentFile.progress, plottingProgress.speedInMibPerSec),
          },
          totalFiles: {
            ...activePlotStatus.totalFiles,
            ...plottingProgress.totalFiles,
            eta: getEta(activePlotStatus.totalFiles.sizeInGib, plottingProgress.totalFiles.progress, plottingProgress.speedInMibPerSec),
          },
        }
      }
      _activePlotsByNodeId.set(plottingProgress.nodeId, activePlotStatus)

      return _activePlotsByNodeId
    }),
    filter((activePlots): activePlots is Map<string, PlottingStatus> => activePlots !== undefined),
    share(),
  )

  return merge(
    activePlotUpdatesDueToCompletion$,
    activePlotUpdatesDueToProgress$,
  )
}

function getEta(sizeInGib: number, progress: number, speedInMibPerSec: number): Date {
  const remainingGib = sizeInGib * (1 - progress)
  const remainingSeconds = (remainingGib * 1024) / speedInMibPerSec

  return dayjs().add(remainingSeconds, 'seconds').toDate()
}
