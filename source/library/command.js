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
    return Command.execute(() => {})
  })

Command
  .command('run-once [name]')
  .description('Archive the source directories according to the configuration')
  .action((name) => {
    return Command.execute(() => {
      return Promise.all(Configuration.archive
        .filter((archive) => name ? archive.name == name : true)
        .map((archive) => Archive.createArchive(archive.path.source, archive.path.target, archive.path.exclude).runOnce()))
    })
  })

Command
  .command('run-schedule <name>')
  .description('Schedule the archive according to the configuration')
  .action((name) => {
    return Command.execute(() => {
      Configuration.archive
        .filter((archive) => archive.name == name)
        .forEach((archive) => Archive.createArchive(archive.path.source, archive.path.target, archive.path.exclude).startSchedule(archive.schedule))
    })
  })

Command
  .command('start-archive [name]')
  .description('Start both the process manager and the schedule(s)')
  .action((name) => {
    return Command.execute(async () => {
      for (let archive of Configuration.archive.filter((archive) => name ? archive.name == name : true)) {
        await ProcessManager.startArchive(archive.name)
      }
    })
  })

Command
  .command('stop-archive [name]')
  .description('Stop and delete the schedule(s) (the process manager remains running)')
  .action((name) => {
    return Command.execute(async () => {
      for (let archive of Configuration.archive.filter((archive) => name ? archive.name == name : true)) {
        await ProcessManager.stopArchive(archive.name)
      }
    })
  })

Command.on('command:*', () => {
  return Command.execute(async () => {
    Log.error({ 'argument': Command.args }, 'Command.on(\'command:*\', () => { ... })')
    Command.outputHelp((text) => `Invalid command: ${Command.args.join(' ')}\n\n${text}\n`)
  })
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
