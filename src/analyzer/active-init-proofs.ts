import {merge, filter, map, Observable} from 'rxjs'
import {LogLine} from '../types/log-line.js'
import {makeLogger} from '../logging/logger.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime.js'
import {ActiveProof, ActiveProofState, mapToProofReading} from './active-proof-reading.js'

dayjs.extend(relativeTime)

interface InitProofStart {
  startedAt: Date
  nodeId: string
}

const initProofStartRegex = /^msg="Start generating initialization Proof" difficulty=\w+ nodeId=(\w+) thread=\d+$/
export function mapToInitProofStart(logLines$: Observable<LogLine>): Observable<InitProofStart> {
  return logLines$.pipe(
    map((logLine): InitProofStart|undefined => {
      const matches = logLine.message.match(initProofStartRegex)
      if (matches === null || matches.length !== 2) {
        return
      }

      return {
        nodeId: matches[1],
        startedAt: logLine.date.toDate(),
      }
    }),
    filter((info): info is InitProofStart => info !== undefined),
  )
}

interface InitProofEnd {
  endedAt: Date
  nodeId: string
}

const initProofEndRegex = /^msg="End generating initialization Proof" consume=([\d.]+)s difficulty=\w+ nodeId=(\w+) thread=\d+$/
export function mapToInitProofEnd(logLines$: Observable<LogLine>): Observable<InitProofEnd> {
  return logLines$.pipe(
    map((logLine): InitProofEnd|undefined => {
      const matches = logLine.message.match(initProofEndRegex)
      if (matches === null || matches.length !== 3) {
        return
      }

      return {
        nodeId: matches[2],
        endedAt: logLine.date.toDate(),
      }
    }),
    filter((info): info is InitProofEnd => info !== undefined),
  )
}

const logger = makeLogger({ name: 'Proving' })
export function mapToActiveInitProofs(logLines$: Observable<LogLine>): Observable<Map<string, ActiveProof>> {
  const activeInitProofs: Map<string, ActiveProof> = new Map<string, ActiveProof>()

  const activeInitProofUpdatesDueToAdd$ = mapToInitProofStart(logLines$).pipe(
    map(initProofStart => {
      activeInitProofs.set(initProofStart.nodeId, {
        ...initProofStart,
        state: ActiveProofState.generatingK2Pow,
        stateStartedAt: initProofStart.startedAt,
      })

      return activeInitProofs
    })
  )
  const activeInitProofUpdatesDueToReading$ = mapToProofReading(logLines$).pipe(
    map(proofReading => {
      const activeInitProof = activeInitProofs.get(proofReading.nodeId)
      if (activeInitProof !== undefined) {
        activeInitProof.state = ActiveProofState.readingProofOfSpace
        activeInitProof.stateStartedAt = proofReading.startedAt
      }

      return activeInitProofs
    })
  )
  const activeInitProofUpdatesDueToDelete$ = mapToInitProofEnd(logLines$).pipe(
    map(initProofEnd => {
      const activeInitProof = activeInitProofs.get(initProofEnd.nodeId)
      if (activeInitProof !== undefined) {
        const duration = dayjs(initProofEnd.endedAt).to(activeInitProof.startedAt, true)
        logger.info(`Finished init proof for ${activeInitProof.nodeId}, took ${duration}`)
      }
      activeInitProofs.delete(initProofEnd.nodeId)

      return activeInitProofs
    })
  )

  return merge(
    activeInitProofUpdatesDueToAdd$,
    activeInitProofUpdatesDueToReading$,
    activeInitProofUpdatesDueToDelete$,
  )
}
