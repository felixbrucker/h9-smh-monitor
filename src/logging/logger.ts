import {Logger, ISettingsParam, ILogObj} from 'tslog'

export function makeLogger(options: ISettingsParam<ILogObj> = {}): Logger<ILogObj> {
  return new Logger({
    prettyLogTemplate: '{{dateIsoStr}} {{logLevelName}}\t[{{name}}] ',
    prettyErrorParentNamesSeparator: ' | ',
    prettyLogTimeZone: 'local',
    ...options,
  })
}

export const defaultLogger = makeLogger({ name: 'Main' })
