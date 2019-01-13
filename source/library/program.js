import { FileSystem, Log, Path, Process } from '@virtualpatterns/mablung'
import _Program from 'commander'

import Configuration from '../configuration'

const Program = Object.create(_Program)

Program.execute = async function (fn) {
    
  try {

    Configuration.path.configuration = Program.configurationPath || Configuration.path.configuration

    try {
      await FileSystem.access(Configuration.path.configuration, FileSystem.F_OK)
    }
    catch (error) {

      let configuration = {
        'path': {
          'source': [ 
            `${Process.env.HOME}/.lotho`
          ],
          'target': `BUCKBEAK.local:/Volumes/BUCKBEAK1/Backup/${Configuration.computerName}`,
          'exclude': [
            '.DS_Store',
            '.localized',
            'Icon\\#015'
          ]
        },
        'schedule': '0 0 */1 * * *' // At 0 seconds and 0 minutes every hour
      }

      await FileSystem.mkdir(Path.dirname(Configuration.path.configuration), { 'recursive': true })
      await FileSystem.writeJson(Configuration.path.configuration, configuration, { 'encoding': 'utf-8', 'spaces': 2 })

    }

    Configuration.merge()

    Configuration.logPath = Program.logPath || Configuration.logPath
    Configuration.logLevel = Program.logLevel || Configuration.logLevel

    if (Configuration.logPath == 'console') {
      Log.createFormattedLog({ 'level': Configuration.logLevel })
    }
    else {
      await FileSystem.mkdir(Path.dirname(Configuration.logPath), { 'recursive': true })
      Log.createFormattedLog({ 'level': Configuration.logLevel }, Configuration.logPath)
    }

    try {

      Process.on('SIGHUP', () => {
        Log.debug('Process.once(\'SIGHUP\', () => { ... })')

        if (Configuration.logPath == 'console') {
          Log.createFormattedLog({ 'level': Configuration.logLevel })
        }
        else {
          Log.createFormattedLog({ 'level': Configuration.logLevel }, Configuration.logPath)
        }
    
      })

      Process.once('uncaughtException', (error) => {
        Log.error(error, 'Process.once(\'uncaughtException\', (error) => { ... })')
        Process.exit(3)
      })
  
      Process.on('warning', (error) => {
        Log.error(error, 'Process.on(\'warning\', (error) => { ... })')
      })
  
      await fn()
  
    }
    catch (error) {
      
      delete error.name

      Log.error(error, 'catch (error) { ... }')
  
      Process.exit(2)
  
    }

  } 
  catch (error) {

    console.log(error)

    Process.exit(1)

  }
  
}

export default Program
