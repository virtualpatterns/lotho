#!/usr/bin/env node

import '@babel/polyfill'
import { Log, Path, Process } from '@virtualpatterns/mablung'
import PM2 from 'pm2'
import Source from 'source-map-support'
import Utilities from 'util'

import Archive from './library/archive'
import Configuration from './configuration'
import Package from '../package.json'
import Program from './library/program'

Source.install({ 'handleUncaughtExceptions': false })

PM2.connect = Utilities.promisify(PM2.connect)
PM2.start = Utilities.promisify(PM2.start)
PM2.stop = Utilities.promisify(PM2.stop)
PM2.delete = Utilities.promisify(PM2.stop)
PM2.restart = Utilities.promisify(PM2.restart)

Program
  .version(Package.version)
  .description('Archive from source directories to target directory')
  .option('--configurationPath <path>', `Configuration path, defaults to '${Path.trim(Configuration.path.configuration)}'`)
  .option('--logLevel <path>', `Log level, one of 'fatal', 'error', 'warn', 'info', 'debug', or 'trace', defaults to '${Configuration.logLevel}'`)
  .option('--logPath <path>', `Log file path, 'console' ouputs to the console, defaults to '${Path.trim(Configuration.logPath)}'`)

Program
  .command('runOnce', { 'isDefault': true })
  .description('Archive the source directories according to the configuration')
  .action(() => {
    return Program.execute(async () => {
      await Archive.createArchive().runOnce()
    })
  })
 
Program
  .command('startSchedule')
  .description('Schedule the archive according to the configuration')
  .action(() => {
    return Program.execute(() => {
      return Archive.createArchive().startSchedule()
    })
  })
 
Program
  .command('start')
  .description('Start both the process manager and the schedule')
  .action(() => {
    return Program.execute(async () => {

      await PM2.connect()

      try {

        let options = {
          'apps': [
            {
              'name': Package.name,
              'script': __filename,
              'args': [ 
                '--configurationPath', Configuration.path.configuration,
                '--logPath', Configuration.logPath,
                '--logLevel', Configuration.logLevel,
                'startSchedule' 
              ]
            }
          ]
        }

        Log.debug(options, 'PM2.start(options)')
        await PM2.start(options)

      }
      finally {
        await PM2.disconnect()
      }

    })
  })
 
Program
  .command('stop')
  .description('Stop the schedule (the process manager remains running)')
  .action(() => {
    return Program.execute(async () => {

      await PM2.connect()

      try {

        Log.debug(`PM2.stop('${Package.name}')`)
        await PM2.stop(Package.name)

      }
      finally {
        await PM2.disconnect()
      }

    })
  })

Program
  .parse(Process.argv)
