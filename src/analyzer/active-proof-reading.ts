import {merge, filter, map, Observable} from 'rxjs'
import {LogLine} from '../types/log-line.js'
import {makeLogger} from '../logging/logger.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime.js'

dayjs.extend(relativeTime)

interface ProofStart {
  startedAt: Date
  nodeId: string
}

const proofStartRegex = /^msg="Start generate Proof" challenge=\w+ nodeId=(\w+)$/
export function mapToProofStart(logLines$: Observable<LogLine>): Observable<ProofStart> {
  return logLines$.pipe(
    map((logLine): ProofStart|undefined => {
      const matches = logLine.message.match(proofStartRegex)
      if (matches === null || matches.length !== 2) {
        return
      }

      return {
        nodeId: matches[1],
        startedAt: logLine.date.toDate(),
      }
    }),
    filter((info): info is ProofStart => info !== undefined),
  )
}

export interface ProofReading {
  startedAt: Date
  nodeId: string
}

const proofReadingRegex = /^msg="Reading POS files: \\"([\w\\/:]+)[/|\\]post_(\w+)\\""/
export function mapToProofReading(logLines$: Observable<LogLine>): Observable<ProofReading> {
  return logLines$.pipe(
    map((logLine): ProofReading|undefined => {
      const matches = logLine.message.match(proofReadingRegex)
      if (matches === null || matches.length !== 3) {
        return
      }

      return {
        nodeId: matches[2],
        startedAt: logLine.date.toDate(),
      }
    }),
    filter((info): info is ProofReading => info !== undefined),
  )
}

interface ProofEnd {
  endedAt: Date
  nodeId: string
}

const proofEndRegex = /^msg="Submit post success" nodeId=(\w+) success=\d+ total=\d+$/
export function mapToProofEnd(logLines$: Observable<LogLine>): Observable<ProofEnd> {
  return logLines$.pipe(
    map((logLine): ProofEnd|undefined => {
      const matches = logLine.message.match(proofEndRegex)
      if (matches === null || matches.length !== 2) {
        return
      }

      return {
        nodeId: matches[1],
        endedAt: logLine.date.toDate(),
      }
    }),
    filter((info): info is ProofEnd => info !== undefined),
  )
}

export enum ActiveProofState {
  generatingK2Pow = 'generatingK2Pow',
  readingProofOfSpace = 'readingProofOfSpace',
}

export interface ActiveProof {
  nodeId: string
  startedAt: Date
  state: ActiveProofState
  stateStartedAt: Date
}

const logger = makeLogger({ name: 'Proving' })
export function mapToActiveProofs(logLines$: Observable<LogLine>): Observable<Map<string, ActiveProof>> {
  const activeProofs: Map<string, ActiveProof> = new Map<string, ActiveProof>()

  const activeProofUpdatesDueToAdd$ = mapToProofStart(logLines$).pipe(
    map(proofStart => {
      activeProofs.set(proofStart.nodeId, {
        ...proofStart,
        state: ActiveProofState.generatingK2Pow,
        stateStartedAt: proofStart.startedAt,
      })

      return activeProofs
    })
  )
  const activeProofUpdatesDueToReading$ = mapToProofReading(logLines$).pipe(
    map(initProofReading => {
      const activeProof = activeProofs.get(initProofReading.nodeId)
      if (activeProof !== undefined) {
        activeProof.state = ActiveProofState.readingProofOfSpace
        activeProof.stateStartedAt = initProofReading.startedAt
      }

      return activeProofs
    })
  )
  const activeProofUpdatesDueToDelete$ = mapToProofEnd(logLines$).pipe(
    map(initProofEnd => {
      const activeProof = activeProofs.get(initProofEnd.nodeId)
      if (activeProof !== undefined) {
        const duration = dayjs(initProofEnd.endedAt).to(activeProof.startedAt, true)
        logger.info(`Finished proof for ${activeProof.nodeId}, took ${duration}`)
      }
      activeProofs.delete(initProofEnd.nodeId)

      return activeProofs
    })
  )

  return merge(
    activeProofUpdatesDueToAdd$,
    activeProofUpdatesDueToReading$,
    activeProofUpdatesDueToDelete$,
  )
}
