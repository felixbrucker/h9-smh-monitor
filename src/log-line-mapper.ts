import dayjs from 'dayjs'
import {LogLevel, LogLine, LogTag} from './types/log-line.js'

const logLineRegex1 = /^time="([0-9-]+ [0-9:]+) ([0-9]+)" level=([a-z]+) (.+)/
const logLineRegex2 = /^\[([0-9-]+ [0-9:]+)]\s+(.+)/
const logLineRegex3 = /^\*{4} ([^*]+)/

export function mapToLogLine(line: string): LogLine|undefined {
  let matches = line.trim().match(logLineRegex1)
  if (matches !== null && matches.length === 5) {
    return {
      date: dayjs(`${matches[1]}:${matches[2]}`),
      logLevel: matches[3] as LogLevel,
      tag: LogTag.regular,
      message: matches[4],
    }
  }
  matches = line.trim().match(logLineRegex2)
  if (matches !== null && matches.length === 3) {
    return {
      date: dayjs(matches[1]),
      logLevel: LogLevel.info,
      tag: LogTag.regular,
      message: matches[2],
    }
  }
  matches = line.trim().match(logLineRegex3)
  if (matches !== null && matches.length === 2) {
    return {
      date: dayjs(),
      logLevel: LogLevel.info,
      tag: LogTag.startup,
      message: matches[1],
    }
  }
}
