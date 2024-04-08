import {env} from 'node:process'

export const logFilePath: string = env.LOG_FILE_PATH ?? 'logs'
export const authToken: string = env.AUTH_TOKEN ?? '1234'
export const apiListenHost: string = env.API_LISTEN_HOST ?? '127.0.0.1'
export const apiListenPort: number = parseInt(env.API_LISTEN_PORT || '', 10) || 8001
