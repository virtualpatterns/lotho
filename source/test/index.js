import '@babel/polyfill'
import { FileSystem, Log, Path } from '@virtualpatterns/mablung'
import Source from 'source-map-support'

import Configuration from '../configuration'

Source.install({ 'handleUncaughtExceptions': false })

before(async () => {

  Configuration.merge(Configuration.test)

  if (Configuration.logPath == 'console') {
    Log.createFormattedLog({ 'level': Configuration.logLevel })
  }
  else {
    await FileSystem.mkdir(Path.dirname(Configuration.logPath), { 'recursive': true })
    await FileSystem.remove(Configuration.logPath)
    Log.createFormattedLog({ 'level': Configuration.logLevel }, Configuration.logPath)
  }

  Log.debug(Configuration.line)

})

require('./library/archive')
require('./library/process-manager')
require('./configuration')
require('./lotho')
