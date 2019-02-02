import { FileSystem, Log, Path, Process } from '@virtualpatterns/mablung'
import _Command from 'commander'

import Configuration from '../configuration'
import Package from '../../package.json'
import ProcessManager from './process-manager'

import Archive from './archive'

import { CommandInvalidError } from './error/command-error'

const Command = Object.create(_Command)

Command
  .version(Package.version)
  .description('Archive from source directories to target directory')
  .option('--configurationPath <path>', `Configuration path, defaults to '${Path.trim(Configuration.path.configuration)}'`)
  .option('--logLevel <path>', `Log level, one of 'fatal', 'error', 'warn', 'info', 'debug', or 'trace', defaults to '${Configuration.logLevel}'`)
  .option('--logPath <path>', `Log file path, 'console' outputs to the console, defaults to '${Path.trim(Configuration.logPath)}'`)

Command
  .command('create-configuration')
  .alias('no-op')
  .description(`Create a default configuration at the path specified if one doesn't exist, defaults to '${Path.trim(Configuration.path.configuration)}'`)
  .action(() => Command.execute(() => {}))

Command
  .command('run-archive [name]')
  .description('Process the archive(s) according to the configuration')
  .action((name) => Command.executeArchive(name, (archive) => Archive.selectArchive(archive).archive()))

Command
  .command('run-schedule <name>')
  .description('Schedule the archive according to the configuration')
  .action((name) => Command.executeArchive(name, (archive) => Archive.selectArchive(archive).startSchedule()))

Command
  .command('start-archive [name]')
  .description('Start both the process manager and the schedule(s)')
  .action((name) => Command.executeArchive(name, async (archive) => {

    let processManager = await ProcessManager.openProcessManager(archive)

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
  .action((name) => Command.executeArchive(name, async (archive) => {

    let processManager = await ProcessManager.openProcessManager(archive)

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
  .action((name) => Command.executeArchive(name, async (archive) => {

    let processManager = await ProcessManager.openProcessManager(archive)

    try {
      await processManager.restartArchive()
    }
    finally {
      await processManager.close()
    }

  }))

Command.on('command:*', Command.onCommandInvalid = () => Command.execute(() => {
  throw new CommandInvalidError(Command.args)
}))

Process.on('exit', () => {
  Command.off('command:*', Command.onCommandInvalid)
})

Command.execute = async function (fn) {
    
  try {

    let configurationPath = Command.configurationPath || Configuration.path.configuration

    try {
      await FileSystem.access(configurationPath, FileSystem.F_OK)
    }
    catch (error) {
      await FileSystem.mkdir(Path.dirname(configurationPath), { 'recursive': true })
      await FileSystem.writeJson(configurationPath, Configuration.default, { 'encoding': 'utf-8', 'spaces': 2 })
    }

    Configuration.merge(configurationPath)

    Configuration.logPath = Command.logPath || Configuration.logPath
    Configuration.logLevel = Command.logLevel || Configuration.logLevel

    if (Configuration.logPath == 'console') {
      Log.createFormattedLog({ 'level': Configuration.logLevel })
    }
    else {
      await FileSystem.mkdir(Path.dirname(Configuration.logPath), { 'recursive': true })
      Log.createFormattedLog({ 'level': Configuration.logLevel }, Configuration.logPath)
    }

    Log.debug(Configuration.line)
    Log.debug(`Node.js ${Process.version} ${Package.name} ${Package.version}`)
    Log.debug(Configuration.line)

    try {

      Process.on('SIGHUP', Command.onSIGHUP = () => {
        Log.debug('Process.on(\'SIGHUP\', () => { ... })')

        if (Configuration.logPath == 'console') {
          Log.createFormattedLog({ 'level': Configuration.logLevel })
        }
        else {
          Log.createFormattedLog({ 'level': Configuration.logLevel }, Configuration.logPath)
        }
    
      })

      Process.once('uncaughtException', Command.onUncaughtException = (error) => {
        Log.error(error, 'Process.once(\'uncaughtException\', (error) => { ... })')
        Process.exit(3)
      })
  
      Process.on('warning', Command.onWarning = (error) => {
        Log.error(error, 'Process.on(\'warning\', (error) => { ... })')
      })
  
      Process.on('exit', () => {
        Process.off('warning', Command.onWarning)
        Process.off('uncaughtException', Command.onUncaughtException)
        Process.off('SIGHUP', Command.onSIGHUP)
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

Command.executeArchive = function (name, fn) {

  return Command.execute(async () => {

    let archive = Configuration.archive.filter((archive) => name ? archive.name == name : true)

    for (let _archive of archive) {

      try {
        await fn(_archive)
      }
      catch (error) {

        if (archive.length == 1) {
          throw error
        } else {
          Log.error(error, 'catch (error) { ... }')
        }

      }

    }

  })

}

export default Command
