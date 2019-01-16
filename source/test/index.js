import '@babel/polyfill'
import { Log } from '@virtualpatterns/mablung'
import Source from 'source-map-support'

import Configuration from '../configuration'

Source.install({ 'handleUncaughtExceptions': false })

Log.createFormattedLog({ 'level': Configuration.test.logLevel }, Configuration.test.logPath)

require('./library/index')
require('./configuration')
require('./lotho')
