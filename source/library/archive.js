import ChildProcess from 'child_process'
import { CronJob as Job } from 'cron'
import { DateTime, Interval } from 'luxon'
import EventEmitter from 'events'
import { FileSystem, Log, Path, Process } from '@virtualpatterns/mablung'
import Property from 'object-path'
import UUID from 'uuid/v4'

import Configuration from '../configuration'
import Is from './utility/is'
import Package from '../../package.json'

import { ArchiveClassNotFoundError, ArchiveArchiveError } from './error/archive-error'

const archivePrototype = Object.create(EventEmitter.prototype)

archivePrototype.startSchedule = async function () {

  if (Is.null(this.job)) { 

    Log.debug(`Scheduling '${this.option.name}' ...`)

    try {

      this.job = new Job(this.option.schedule, async () => {

        Log.debug(Configuration.line)
        Log.debug(`Node.js ${Process.version} ${Package.name} ${Package.version}`)
        Log.debug(Configuration.line)
      
        try {
          await this.onSchedule()
        }
        catch (error) {
          Log.error(error, 'catch (error) { ... }')
        }
      
      })
  
      Process.once('SIGINT', this.onSIGINT = () => {
        Log.debug('Process.once(\'SIGINT\', () => { ... })')
        this.stopSchedule()
      })
  
      Process.once('SIGTERM', this.onSIGTERM = () => {
        Log.debug('Process.once(\'SIGTERM\', () => { ... })')
        this.stopSchedule()
      })

      try {

        this.job.start()

        try {
          await this.onScheduled()
          Log.debug(`Scheduled '${this.option.name}' ${this.getNextSchedule().toFormat(Configuration.format.schedule)}`)
        }
        catch (error) {
          this.job.stop()
          throw error
        }
         
      }
      catch (error) {

        Process.off('SIGTERM', this.onSIGTERM)
        this.onSIGTERM = null
        
        Process.off('SIGINT', this.onSIGINT)
        this.onSIGINT = null
    
        throw error

      }
      
    }
    catch (error) {
      this.job = null
      throw error
    }
  
  }

}

archivePrototype.stopSchedule = async function () {

  if (Is.not.null(this.job)) { 

    this.job.stop()
    this.job = null

    Process.off('SIGTERM', this.onSIGTERM)
    this.onSIGTERM = null

    Process.off('SIGINT', this.onSIGINT)
    this.onSIGINT = null

    await this.onUnscheduled()
    Log.debug(`Unscheduled '${this.option.name}'`)

  }

}

archivePrototype.getNextSchedule = function () {
  return Is.not.null(this.job) ? DateTime.fromJSDate(this.job.nextDates(1)[0].toDate()) : null
}

archivePrototype.onSchedule = async function () {

  let lockPath = Path.join(Configuration.path.home, `archive.${this.id}.lock`)

  Log.trace(`FileSystem.outputFile('${Path.basename(lockPath)}', '', { 'encoding': 'utf-8', 'flag': 'wx' })`)
  await FileSystem.outputFile(lockPath, '', { 'encoding': 'utf-8', 'flag': 'wx' })

  try {

    let stamp = Configuration.now()

    await this.onStarted(stamp)

    try {

      try {

        let result = await this.archive(stamp)
        await this.onSucceeded(result)
    
        return result
  
      }
      catch (error) {
        await this.onFailed(error)
      }
  
    }
    finally {
      await this.onFinished()
    }

  }
  finally {

    if (Is.not.null(this.getNextSchedule())) Log.debug(`Scheduled '${this.option.name}' ${this.getNextSchedule().toFormat(Configuration.format.schedule)}`)

    Log.trace(`FileSystem.remove('${Path.basename(lockPath)}')`)
    await FileSystem.remove(lockPath)

  }

}

archivePrototype.archive = async function (stamp = Configuration.now()) {

  Log.debug(`Archiving '${this.option.name}' ...`)

  let includePath = Path.join(Configuration.path.home, `archive.${this.id}.include`)
  let include = this.option.path.include.reduce((accumulator, path) => `${accumulator}${path}\n`, '')

  let excludePath = Path.join(Configuration.path.home, `archive.${this.id}.exclude`)
  let exclude = this.option.path.exclude.reduce((accumulator, path) => `${accumulator}${path}\n`, '')

  await Promise.all([
    FileSystem.outputFile(includePath, include, { 'encoding': 'utf-8' }),
    FileSystem.outputFile(excludePath, exclude, { 'encoding': 'utf-8' })
  ])

  let result = null

  try {
    result = await this._archive(stamp, includePath, excludePath)
  }
  finally {
    await Promise.all([
      FileSystem.remove(includePath),
      FileSystem.remove(excludePath)
    ])
  }

  return result

}

archivePrototype._archive = function (stamp) {

  return new Promise((resolve, reject) => {

    try {

      let backupPath = `..${Archive.getSeparator(this.option.path.target)}${stamp.toFormat(Configuration.format.stamp)}`
      let includePath = `${this.option.path.home}${Archive.getSeparator(this.option.path.home)}archive.${this.id}.include`
      let excludePath = `${this.option.path.home}${Archive.getSeparator(this.option.path.home)}archive.${this.id}.exclude`
    
      let parameter = Configuration.getParameter(
        { 
          '--backup': true, 
          '--backup-dir': backupPath, 
          '--include-from': includePath, 
          '--exclude-from': excludePath 
        },
        Configuration.parameter.rsync,
        this.option.path.source.map((path) => Archive.getPath(path)),
        [ Archive.getPath(this.option.path.target, Configuration.name.content) ]
      )

      let option = Configuration.getOption(Configuration.option.rsync)
      
      Log.trace({ parameter, option }, `ChildProcess.spawn('${Configuration.path.rsync}', parameter, option) ...`)
      let process = ChildProcess.spawn(Configuration.path.rsync, parameter, option)

      let progress = Process.hrtime()
      let stdout = ''
      let stderr = ''

      process.stdout.on('data', this.onSTDOUT = (data) => {

        let dataAsString = data.toString()
        dataAsString.split('\n').forEach((line) => {

          let pattern = Configuration.pattern.change
          let match = null

          if (Is.not.null(match = pattern.exec(line))) {

            let [ , change, path ] = match
            let action = null

            /*
              < means that a file is being transferred to the remote host (sent).
              > means that a file is being transferred to the local host (received).
              c means that a local change/creation is occurring for the item (such as the creation of a directory or the changing of a symlink, etc.).
              h means that the item is a hard link to another item (requires --hard-links).
              . means that the item is not being updated (though it might have attributes that are being modified).
              * means that the rest of the itemized-output area contains a message (e.g. "deleting"). 
            */

            switch (change[0]) {
              case '<':
              case '>':
                action = 'Sending'
                break
              case 'c':
                action = 'Creating'
                break
              case 'h':
                action = 'Linking'
                break
              case '.':
                action = 'Updating'
                break
              case '*':
                action = `${change.substring(1, 2).toUpperCase()}${change.substring(2)}`
                break
              default:
                action = change
            }

            let progressAsDuration = Configuration.conversion.toDuration(Process.hrtime(progress))
            let minimumProgressAsDuration = Configuration.range.progress.minimum

            if (progressAsDuration >= minimumProgressAsDuration) {
              Log.debug(`${action} '${Path.basename(path)}' ...`)
              progress = Process.hrtime()
            }

          }
          else {
            stdout += Is.emptyString(line) ? '' : `${line}\n`
          }

        })

      })
      
      process.stderr.on('data', this.onSTDERR = (data) => {
        let dataAsString = data.toString()
        stderr += dataAsString.toString()
      })

      process.once('error', this.onError = (error) => {

        process.off('exit', this.onExit)
        process.off('error', this.onError)
        process.stderr.off('data', this.onSTDERR)
        process.stdout.off('data', this.onSTDOUT)

        // Log.error(error, 'ChildProcess.on(\'error\'), (error) => { ... })')
        reject(new ArchiveArchiveError(error))

      })
      
      process.once('exit', this.onExit = (code, signal) => {

        process.off('exit', this.onExit)
        process.off('error', this.onError)
        process.stderr.off('data', this.onSTDERR)
        process.stdout.off('data', this.onSTDOUT)

        Log.trace(`ChildProcess.on('exit'), (${code}, ${Is.not.null(signal) ? `'${signal}'` : signal}) => { ... })`)
        if (Is.not.emptyString(stdout)) Log.trace(`\n\n${stdout}`)

        if (code == 0) {  
          
          let result = { 'stamp': stamp, 'statistic': this.getArchiveStatistic(stdout) }

          Log.debug(`Scanned: ${result.statistic.countOfScanned}`)
          Log.debug(`Created: ${result.statistic.countOfCreated}`)
          Log.debug(`Updated: ${result.statistic.countOfUpdated}`)
          if (Is.not.undefined(result.statistic.countOfDeleted)) Log.debug(`Deleted: ${result.statistic.countOfDeleted}`)

          resolve(result)

        }
        else {
          // if (Is.not.emptyString(stderr)) Log.error(`\n\n${stderr}`)
          reject(new ArchiveArchiveError(stderr))
        }

      })

    }
    catch (error) {
      reject(error)
    }

  })

}

archivePrototype.getArchiveStatistic = function (stdout) {

  return {
    'countOfScanned': Archive.getCountOfScanned(stdout),
    'countOfCreated': Archive.getCountOfCreated(stdout),
    'countOfUpdated': Archive.getCountOfUpdated(stdout)
  }

}

archivePrototype.onScheduled = function () {
  this.emit('scheduled')
}

archivePrototype.onStarted = function (stamp) {
  this.emit('started', stamp)
}

archivePrototype.onSucceeded = function (result) {
  this.emit('succeeded', result)
}

archivePrototype.onFailed = function (error) {
  this.emit('failed', error)
}

archivePrototype.onFinished = function () {
  this.emit('finished')
}

archivePrototype.onUnscheduled = function () {
  this.emit('unscheduled')
}

const Archive = Object.create({})

Archive.archiveClass = []

Archive.createArchive = function (option, prototype = archivePrototype) {

  option.path.home = Property.get(option.path, 'home', Configuration.path.home)
  option.path.source = Is.array(option.path.source) ? option.path.source : [ option.path.source ]
  option.path.include = Is.array(option.path.include = Property.get(option.path, 'include', []) ) ? option.path.include : [ option.path.include ]
  option.path.exclude = Is.array(option.path.exclude = Property.get(option.path, 'exclude', []) ) ? option.path.exclude : [ option.path.exclude ]

  let archive = Object.create(prototype)

  archive.id = UUID()
  archive.option = option
  archive.job = null

  return archive

}

Archive.getArchivePrototype = function () {
  return archivePrototype
}

Archive.isArchive = function (archive) {
  return archivePrototype.isPrototypeOf(archive)
}

Archive.isArchiveClass = function () {
  return false
}

Archive.registerArchiveClass = function(archiveClass = this) {
  this.archiveClass.push(archiveClass)
}

Archive.selectArchiveClass = function(option) {

  for (let archiveClass of this.archiveClass) {
    if (archiveClass.isArchiveClass(option)) {
      return archiveClass
    }
  }

  throw new ArchiveClassNotFoundError(option)

}

Archive.selectArchive = function (option) {
  return this.selectArchiveClass(option).createArchive(option)
}

Archive.getSeparator = function (path) {

  let countBackwardSlash = 0
  let countForwardSlash = 0

  while(Configuration.pattern.backwardSlash.exec(path) != null) countBackwardSlash +=1
  while(Configuration.pattern.forwardSlash.exec(path) != null) countForwardSlash +=1

  return countBackwardSlash > countForwardSlash ? '\\' : '/'

}

Archive.getPath = function (path, addToPath = '') {

  let match = null

  if (Is.not.null(match = Configuration.pattern.remotePath.exec(path))) {
    let [ , computerName, path ] = match

    if (Configuration.pattern.whitespace.test(path)) {
      return `${computerName}:"${path}${Archive.getSeparator(path)}${addToPath}"`
    }
    else {
      return `${computerName}:${path}${Archive.getSeparator(path)}${addToPath}`
    }

  }
  else {
    return `${path}${Archive.getSeparator(path)}${addToPath}`
  }

}

Archive.getCountOfScanned = function (stdout) {
  return this.getIntegerStatistic(Configuration.pattern.countOfScanned, stdout)
}

Archive.getCountOfCreated = function (stdout) {
  return this.getIntegerStatistic(Configuration.pattern.countOfCreated, stdout)
}

Archive.getCountOfUpdated = function (stdout) {
  return this.getIntegerStatistic(Configuration.pattern.countOfUpdated, stdout)
}

Archive.getIntegerStatistic = function (pattern, stdout) {

  let match = null

  if (Is.not.null(match = pattern.exec(stdout))) {
  
    let [ , statisticAsString ] = match
    let statistic = parseInt(statisticAsString.replace(/,/g, ''))

    return statistic

  }

  return null

}

Archive.isExpired = function (current, previous, next) {
  // Log.trace(`Archive.isExpired('${current.toFormat(Configuration.format.stamp)}', '${previous.toFormat(Configuration.format.stamp)}', '${next.toFormat(Configuration.format.stamp)}')`)

  if (previous < next && next < current) {

    let message = []

    message.push(` current '${current.toFormat(Configuration.format.stamp)}'`)

    let age = Interval.fromDateTimes(previous, current).toDuration()
    let isExpired = false

    switch (true) {
      case age.as('seconds') < 1.0:
        // message.push(`previous '${previous.toFormat(Configuration.format.stamp)}' < 1s old`)
        isExpired = false
        break
      case age.as('minutes') < 1.0:
        // true for all but last of second
        // message.push(`previous '${previous.toFormat(Configuration.format.stamp)}' < 1m old`)
        // message.push(`    next '${next.toFormat(Configuration.format.stamp)}' ${previous.second}s ${previous.second == next.second ? '=' : 'not ='} ${next.second}s`)
        isExpired = previous.second == next.second
        break
      case age.as('hours') < 1.0:
        // true for all but last of minute
        // message.push(`previous '${previous.toFormat(Configuration.format.stamp)}' < 1h old`)
        // message.push(`    next '${next.toFormat(Configuration.format.stamp)}' ${previous.minute}m ${previous.minute == next.minute ? '=' : 'not ='} ${next.minute}m`)
        isExpired = previous.minute == next.minute
        break
      case age.as('days') < 1.0:
        // true for all but last of hour
        // message.push(`previous '${previous.toFormat(Configuration.format.stamp)}' < 1d old`)
        // message.push(`    next '${next.toFormat(Configuration.format.stamp)}' ${previous.hour}h ${previous.hour == next.hour ? '=' : 'not ='} ${next.hour}h`)
        isExpired = previous.hour == next.hour
        break
      case age.as('months') < 1.0:
        // true for all but last of day
        // message.push(`previous '${previous.toFormat(Configuration.format.stamp)}' < 1mo old`)
        // message.push(`    next '${next.toFormat(Configuration.format.stamp)}' ${previous.day}d ${previous.day == next.day ? '=' : 'not ='} ${next.day}d`)
        isExpired = previous.day == next.day
        break
      case age.as('years') < 1.0:
        // true for all but last of month
        // message.push(`previous '${previous.toFormat(Configuration.format.stamp)}' < 1y old`)
        // message.push(`    next '${next.toFormat(Configuration.format.stamp)}' ${previous.month}mo ${previous.month == next.month ? '=' : 'not ='} ${next.month}mo`)
        isExpired = previous.month == next.month
        break
      case age.as('years') >= 1.0:
        // true for all but last of year
        // message.push(`previous '${previous.toFormat(Configuration.format.stamp)}' >= 1y old`)
        // message.push(`    next '${next.toFormat(Configuration.format.stamp)}' ${previous.year}y ${previous.year == next.year ? '=' : 'not ='} ${next.year}y`)
        isExpired = previous.year == next.year
        break
      default:
        isExpired = false
    }

    // if (isExpired) message.forEach((message) => Log.trace(message))
    if (isExpired) Log.trace(`Archive.isExpired('${current.toFormat(Configuration.format.stamp)}', '${previous.toFormat(Configuration.format.stamp)}', '${next.toFormat(Configuration.format.stamp)}')`)

    return isExpired
      
  }
  else {
    return false
  }

}

export default Archive
