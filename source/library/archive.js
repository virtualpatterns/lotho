import ChildProcess from 'child_process'
import { CronJob as Job } from 'cron'
import { DateTime, Interval } from 'luxon'
import EventEmitter from 'events'
import { FileSystem, Log, Path, Process } from '@virtualpatterns/mablung'
import Merge from 'deepmerge'
import Property from 'object-path'
import UUID from 'uuid/v4'

import Configuration from '../configuration'
import Is from './is'

import { ArchiveClassNotFoundError, ArchiveLockError, ArchiveSynchronizeError } from './error/archive-error'

const archivePrototype = Object.create(EventEmitter.prototype)

archivePrototype.startSchedule = function () {

  if (Is.null(this.job)) { 

    Log.debug(`Scheduling archive '${this.option.name}' ...`)

    this.job = new Job(this.option.schedule, this.onScheduled.bind(this), this.onStopped.bind(this))
    this.job.start()
      
    Process.once('SIGINT', this.SIGINT = () => {
      Log.debug('Process.once(\'SIGINT\', () => { ... })')
      this.stopSchedule()
    })

    Process.once('SIGTERM', this.SIGTERM = () => {
      Log.debug('Process.once(\'SIGTERM\', () => { ... })')
      this.stopSchedule()
    })
  
    Log.debug(`Next scheduled for '${this.option.name}' ${this.getNextSchedule().toFormat(Configuration.format.schedule)}`)

  }

}

archivePrototype.stopSchedule = function () {

  if (Is.not.null(this.job)) { 

    Log.debug(`Unscheduling archive '${this.option.name}' ...`)

    Process.off('SIGINT', this.SIGINT)
    this.SIGINT = null

    Process.off('SIGTERM', this.SIGTERM)
    this.SIGTERM = null

    this.job.stop()
    this.job = null

  }

}

archivePrototype.getNextSchedule = function () {
  return Is.not.null(this.job) ? DateTime.fromJSDate(this.job.nextDates(1)[0].toDate()) : null
}

archivePrototype.onScheduled = async function () {
  Log.debug(Configuration.line)
  
  try {

    let lockPath = Path.join(Configuration.path.home, `archive.${this.id}.lock`)

    try {
      await FileSystem.mkdir(Path.dirname(lockPath), { 'recursive': true })
      await FileSystem.writeFile(lockPath, '', { 'encoding': 'utf-8', 'flag': 'wx' })
    }
    catch (error) {
      Log.error(error, 'catch (error) { ... })')
      throw new ArchiveLockError(lockPath)
    }

    try {

      let result = await this.archive()
      result.nextSchedule = this.getNextSchedule()

      Log.debug(`Next scheduled for '${this.option.name}' ${this.getNextSchedule().toFormat(Configuration.format.schedule)}`)

      this.emit('completed', result)

    }
    finally {
      await FileSystem.unlink(lockPath)
    }
      
  }
  catch (error) {
    Log.error(error, 'catch (error) { ... })')
  }

}

archivePrototype.onStopped = function () {
  this.emit('stopped')
}

archivePrototype.archive = async function (stamp = Configuration.now()) {

  Log.debug(`Archiving '${this.option.name}' ...`)
  let start = Process.hrtime()

  let synchronizeResult = await this.synchronize(stamp)
  let purgeResult = await this.purge(stamp)

  let result = {
    'stamp': stamp,
    'statistic': Merge(synchronizeResult, purgeResult)
  }

  Log.debug({ 'stamp': result.stamp.toFormat(Configuration.format.stamp), 'statistic': result.statistic }, `Archived '${this.option.name}' in ${Configuration.conversion.toDuration(Process.hrtime(start)).toFormat(Configuration.format.shortDuration)}`)

  return result

}

archivePrototype.synchronize = function (stamp) {

  return new Promise(async (resolve, reject) => {

    // let isRejected = false
    // let isResolved = false

    try {

      let parameter = [
        ...Configuration.conversion.toParameter(Configuration.parameter.rsync),
        `--backup-dir=..${Path.sep}${stamp.toFormat(Configuration.format.stamp)}`,
        ...this.option.path.include.map((path) => `--include=${path}`),
        ...this.option.path.exclude.map((path) => `--exclude=${path}`),
        ...this.option.path.source.map((path) => `${path}${Path.sep}`),
        Path.join(this.option.path.target, Configuration.name.content)
      ]
      
      Log.trace({ parameter }, `ChildProcess.spawn('${Configuration.path.rsync}', parameter) ...`)
      let process = ChildProcess.spawn(Configuration.path.rsync, parameter)

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

            let progressInSeconds = Configuration.conversion.toSeconds(Process.hrtime(progress))
            let minimumProgressInSeconds = Configuration.range.progressInSeconds.minimum

            if (progressInSeconds >= minimumProgressInSeconds) {
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

        // if (!isResolved && !isRejected) {

        Log.error(error, 'ChildProcess.on(\'error\'), (error) => { ... })')

        // isRejected = true
        reject(new ArchiveSynchronizeError(this.option))

        // }

      })
      
      process.once('exit', this.onExit = (code, signal) => {

        process.off('exit', this.onExit)
        process.off('error', this.onError)
        process.stderr.off('data', this.onSTDERR)
        process.stdout.off('data', this.onSTDOUT)

        // if (!isResolved && !isRejected) {

        Log.trace(`ChildProcess.on('exit'), (${code}, ${Is.not.null(signal) ? `'${signal}'` : signal}) => { ... })`)
        if (Is.not.emptyString(stdout)) Log.trace(`\n\n${stdout}`)

        if (code == 0) {
          // isResolved = true
          resolve(this.getSynchronizeStatistic(stdout))
        }
        else {

          if (Is.not.emptyString(stderr)) Log.error(`\n\n${stderr}`)

          // isRejected = true
          reject(new ArchiveSynchronizeError())
  
        }
          
        // }

      })

    }
    catch (error) {

      // if (!isResolved && !isRejected) {

      // isRejected = true
      reject(error)

      // }

    }

  })

}

archivePrototype.getSynchronizeStatistic = function (stdout) {

  return {
    'countOfScanned': Archive.getCountOfScanned(stdout),
    'countOfCreated': Archive.getCountOfCreated(stdout),
    'countOfUpdated': Archive.getCountOfUpdated(stdout)
  }

}

archivePrototype.purge = async function (stamp) {

  let current = stamp
  let expired = await this.getExpired(current)

  for (let _expired of expired) {
    await this.copyExpired(_expired.previous, _expired.next)
    await this.deleteExpired(_expired.previous)
  }

  return { 'countOfPurged': expired.length }

}

const Archive = Object.create({})

Archive.archiveClass = []

Archive.createArchive = function (option, prototype = archivePrototype) {

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
  Log.trace(`Archive.isExpired('${current.toFormat(Configuration.format.stamp)}', '${previous.toFormat(Configuration.format.stamp)}', '${next.toFormat(Configuration.format.stamp)}')`)

  if (previous < next && next < current) {

    let age = Interval.fromDateTimes(previous, current).toDuration()
    let isExpired = false

    switch (true) {
      case age.as('seconds') < 1.0:
        isExpired = false
        break
      case age.as('minutes') < 1.0:
        // true for all but last of second
        isExpired = previous.second == next.second
        break
      case age.as('hours') < 1.0:
        // true for all but last of minute
        isExpired = previous.minute == next.minute
        break
      case age.as('days') < 1.0:
        // true for all but last of hour
        isExpired = previous.hour == next.hour
        break
      case age.as('months') < 1.0:
        // true for all but last of day
        isExpired = previous.day == next.day
        break
      case age.as('years') < 1.0:
        // true for all but last of month
        isExpired = previous.month == next.month
        break
      case age.as('years') >= 1.0:
        // true for all but last of year
        isExpired = previous.year == next.year
        break
      default:
        isExpired = false
    }

    return isExpired
      
  }
  else {
    return false
  }

}

export default Archive
