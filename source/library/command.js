import { FileSystem, Log, Path, Process } from '@virtualpatterns/mablung'
import _Command from 'commander'
import Property from 'object-path'

import Archive from './archive'
import Configuration from '../configuration'
import Package from '../../package.json'
import ProcessManager from './process-manager'
import Publisher from './archive/handler/publisher'
import Server from './archive/handler/server'

import { CommandInvalidError } from './error/command-error'

const Command = Object.create(_Command)

Command
  .version(Package.version)
  .description('Archive from source directories to target directory')
  .option('--configuration-path <path>', `Configuration path, defaults to '${Path.trim(Configuration.path.configuration)}'`)
  .option('--log-level <path>', `Log level, one of 'fatal', 'error', 'warn', 'info', 'debug', or 'trace', defaults to '${Configuration.logLevel}'`)
  .option('--log-path <path>', `Log file path, 'console' outputs to the console, defaults to '${Path.trim(Configuration.logPath)}'`)

Command
  .command('create-configuration')
  .alias('no-op')
  .description(`Create a default configuration at the path specified if one doesn't exist, defaults to '${Path.trim(Configuration.path.configuration)}'`)
  .action(() => Command.onAction(() => {}))

Command
  .command('run-archive [name]')
  .description('Process the archive(s) according to the configuration')
  .action((name) => Command.onOption(name, (option) => Archive.selectArchive(option).archive()))

Command
  .command('run-schedule <name>')
  .description('Schedule the archive according to the configuration')
  .action((name) => Command.onOption(name, (option) => {
    
    let archive = Archive.selectArchive(option)
    
    Server.createHandler(archive)
    Publisher.createHandler(archive)
 
    archive.startSchedule()
  
  }))

Command
  .command('start-archive [name]')
  .description('Start both the process manager and the schedule(s)')
  .action((name) => Command.onOption(name, async (option) => {

    let processManager = await ProcessManager.openProcessManager(option)

    try {
      await processManager.startArchive()
    }
    finally {
      await processManager.close()
    }

  }))

Command
  .command('stop-archive [name]')
  .description('Stop and delete the schedule(s) (the process manager remains running)')
  .action((name) => Command.onOption(name, async (option) => {

    let processManager = await ProcessManager.openProcessManager(option)

    try {
      await processManager.stopArchive()
    }
    finally {
      await processManager.close()
    }

  }))

Command
  .command('restart-archive [name]')
  .description('Stop and re-start the schedule(s)')
  .action((name) => Command.onOption(name, async (option) => {

    let processManager = await ProcessManager.openProcessManager(option)

    try {
      await processManager.restartArchive()
    }
    finally {
      await processManager.close()
    }

  }))

Command.on('command:*', () => Command.onAction(() => {
  throw new CommandInvalidError(Command.args)
}))

Command.onAction = async function (fn) {
    
  try {

    let configurationPath = Property.get(Command, 'configurationPath', Configuration.path.configuration)

    try {
      await FileSystem.access(configurationPath, FileSystem.F_OK)
    }
    catch (error) {
      await FileSystem.outputJson(configurationPath, Configuration.default, { 'encoding': 'utf-8', 'spaces': 2 })
    }

    Configuration.merge(configurationPath)

    Configuration.logPath = Property.get(Command, 'logPath', Configuration.logPath)
    Configuration.logLevel = Property.get(Command, 'logLevel', Configuration.logLevel)

    if (Configuration.logPath == 'console') {
      Log.createFormattedLog({ 'level': Configuration.logLevel })
    }
    else {
      await FileSystem.ensureDir(Path.dirname(Configuration.logPath))
      Log.createFormattedLog({ 'level': Configuration.logLevel }, Configuration.logPath)
    }

    Log.debug(Configuration.line)
    Log.debug(`Node.js ${Process.version} ${Package.name} ${Package.version}`)
    Log.debug(Configuration.line)

    try {

      Process.on('SIGHUP', () => {
        Log.debug('Process.on(\'SIGHUP\', () => { ... })')

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
      Log.error(error, 'catch (error) { ... }')
      Process.exit(2)
    }

  } 
  catch (error) {
    console.log(error)
    Process.exit(1)
  }

}

Command.onOption = function (name, fn) {

  return Command.onAction(async () => {

    let option = Configuration.archive.filter((option) => name ? option.name == name : true)

    for (let _option of option) {

      try {
        await fn(_option)
      }
      catch (error) {

        if (option.length == 1) {
          throw error
        } else {
          Log.error(error, 'catch (error) { ... }')
        }

      }

    }

  })

}

export default Command
