import { FileSystem, Log, Path, Process } from '@virtualpatterns/mablung'
import _Command from 'commander'

import Archive from './archive'
import Configuration from '../configuration'
import Package from '../../package.json'
import ProcessManager from './process-manager'

const Command = Object.create(_Command)

Command
  .version(Package.version)
  .description('Archive from source directories to target directory')
  .option('--configurationPath <path>', `Configuration path, defaults to '${Path.trim(Configuration.path.configuration)}'`)
  .option('--logLevel <path>', `Log level, one of 'fatal', 'error', 'warn', 'info', 'debug', or 'trace', defaults to '${Configuration.logLevel}'`)
  .option('--logPath <path>', `Log file path, 'console' outputs to the console, defaults to '${Path.trim(Configuration.logPath)}'`)

Command
  .command('create-configuration')
  .description(`Create a default configuration at the path specified if one doesn't exist, defaults to '${Path.trim(Configuration.path.configuration)}'`)
  .action(() => {
    return Command.execute(() => {
      Log.debug(Configuration.line)
      Log.debug('create-configuration')
      Log.debug(Configuration.line)
    })
  })

Command
  .command('run-once')
  .description('Archive the source directories according to the configuration')
  .action(() => {
    return Command.execute(() => {
      Log.debug(Configuration.line)
      Log.debug('run-once')
      Log.debug(Configuration.line)
      return Archive.createArchive().runOnce()
    })
  })

Command
  .command('run-schedule')
  .description('Schedule the archive according to the configuration')
  .action(() => {
    return Command.execute(() => {
      Log.debug(Configuration.line)
      Log.debug('run-schedule')
      Log.debug(Configuration.line)
      return Archive.createArchive().startSchedule()
    })
  })

Command
  .command('start-archive')
  .description('Start both the process manager and the schedule')
  .action(() => {
    return Command.execute(() => {
      Log.debug(Configuration.line)
      Log.debug('start-archive')
      Log.debug(Configuration.line)
      return ProcessManager.startArchive()
    })
  })

Command
  .command('status-archive')
  .description('Log the status of the schedule')
  .action(() => {
    return Command.execute(() => {
      Log.debug(Configuration.line)
      Log.debug('status-archive')
      Log.debug(Configuration.line)
      return ProcessManager.logStatusOfArchive()
    })
  })

Command
  .command('stop-archive')
  .description('Stop the schedule (the process manager remains running)')
  .action(() => {
    return Command.execute(() => {
      Log.debug(Configuration.line)
      Log.debug('stop-archive')
      Log.debug(Configuration.line)
      return ProcessManager.stopArchive()
    })
  })

// Command
//   .command('kill-process-manager')
//   .description('Stop the process manager (the schedule is stopped as well)')
//   .action(() => {
//     return Command.execute(async () => {
//       Log.debug(Configuration.line)
//       Log.debug('kill-process-manager')
//       Log.debug(Configuration.line)
//       await ProcessManager.kill()
//       // Process.exit(0)
//     })
//   })

Command.on('command:*', () => {
  return Command.execute(async () => {
    Log.error({ 'argument': Command.args }, 'Command.on(\'command:*\', () => { ... })')
    Command.outputHelp((text) => `Invalid command: ${Command.args.join(' ')}\n\n${text}\n`)
  })
})

Command.execute = async function (fn) {
    
  try {

    Configuration.path.configuration = Command.configurationPath || Configuration.path.configuration

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

    Configuration.logPath = Command.logPath || Configuration.logPath
    Configuration.logLevel = Command.logLevel || Configuration.logLevel

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

export default Command
