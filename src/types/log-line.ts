import {Dayjs} from 'dayjs'

export enum LogLevel {
  debug = 'debug',
  info = 'info',
  warning = 'warning',
  error = 'error',
  critical = 'critical',
}

export enum LogTag {
  regular,
  startup,
}

export interface LogLine {
  date: Dayjs
  logLevel: LogLevel
  tag: LogTag
  message: string
}
