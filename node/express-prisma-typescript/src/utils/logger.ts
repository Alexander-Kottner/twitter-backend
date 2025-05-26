import { Signale } from 'signale'
import { Constants } from './constants'

const options = {
  disabled: false,
  interactive: false,
  logLevel: Constants.LOG_LEVEL
}

export const Logger = new Signale(options)
