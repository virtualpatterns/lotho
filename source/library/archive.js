import ChildProcess from 'child_process'
import { CronJob as Job } from 'cron'
import { DateTime } from 'luxon'
import EventEmitter from 'events'
import { FileSystem, Log, Path, Process } from '@virtualpatterns/mablung'
import Is from '@pwn/is'
import UUID from 'uuid/v4'

import Configuration from '../configuration'

import { ArchiveRunError } from './error/archive-error'

const archivePrototype = Object.create(EventEmitter.prototype)

archivePrototype.startSchedule = function (schedule) {
  Log.trace(`Archive.startSchedule('${schedule}')`)

  if (Is.null(this.job)) { 

    this.sourcePath.forEach((path, index) => {
      Log.debug(`${index == 0 ? 'Scheduling archive from' : 'and'} '${Path.trim(path)}' ...`)
    })

    this.job = new Job(schedule, this.onScheduled.bind(this), this.onStopped.bind(this)) // , false, Configuration.timeZone)
    this.job.start()
      
    Process.once('SIGINT', this.SIGINT = () => {
      Log.debug('Process.once(\'SIGINT\', () => { ... })')
      this.stopSchedule()
    })

    Process.once('SIGTERM', this.SIGTERM = () => {
      Log.debug('Process.once(\'SIGTERM\', () => { ... })')
      this.stopSchedule()
    })
  
    Log.debug(`Next scheduled archive ${this.getNextRun().toFormat(Configuration.format.longSchedule)}`)

  }

}

archivePrototype.stopSchedule = function () {
  Log.trace('Archive.stopSchedule()')

  if (Is.not.null(this.job)) { 

    this.sourcePath.forEach((path, index) => {
      Log.debug(`${index == 0 ? 'Unscheduling archive from' : 'and'} '${Path.trim(path)}' ...`)
    })

    Process.off('SIGINT', this.SIGINT)
    this.SIGINT = null

    Process.off('SIGTERM', this.SIGTERM)
    this.SIGTERM = null

    this.job.stop()
    this.job = null

  }

}

archivePrototype.getNextRun = function () {
  return Is.not.null(this.job) ? DateTime.fromJSDate(this.job.nextDates(1)[0].toDate()) : null
}

archivePrototype.onScheduled = async function () {
  Log.trace('Archive.onScheduled()')

  try {

    let lockPath = Path.join(Configuration.path.home, `${this.id}.lock`)

    await FileSystem.mkdir(Path.dirname(lockPath), { 'recursive': true })
    await FileSystem.writeFile(lockPath, '', { 'encoding': 'utf-8', 'flag': 'wx' })

    Log.debug(Configuration.line)
  
    try {

      let result = await this.runOnce()
      result.nextRun = this.getNextRun()

      Log.debug(`Next scheduled archive ${result.nextRun.toFormat(Configuration.format.longSchedule)}`)

      this.emit('completed', result)

    }
    catch (error) {
      Log.trace(error, 'catch (error) { ... })')
    }
    finally {
      await FileSystem.unlink(lockPath)
    }
      
  }
  catch (error) {
    Log.trace(error, 'catch (error) { ... })')
  }

}

archivePrototype.onStopped = function () {
  Log.trace('Archive.onStopped()')
  this.emit('stopped')
}

archivePrototype.runOnce = function () {
  Log.trace('Archive.runOnce()')

  return new Promise(async (resolve, reject) => {

    let isRejected = false
    let isResolved = false

    let stamp = Configuration.now().toFormat(Configuration.format.stamp)

    try {

      this.sourcePath.forEach((path, index) => {
        Log.debug(`${index == 0 ? 'Archiving from' : 'and'} '${Path.trim(path)}' ...`)
      })

      let parameter = [
        ...Configuration.conversion.toParameter(Configuration.parameter.rsync),
        `--backup-dir=../${stamp}`, // ${Path.join(this.targetPath.replace(/^[^:]+:/, ''), stamp)}`,
        ...this.includePath.map((path) => `--include=${path}`),
        ...this.excludePath.map((path) => `--exclude=${path}`),
        ...this.sourcePath.map((path) => `${path}/`), // ...this.sourcePath
        Path.join(this.targetPath, 'content')
      ]
      
      Log.trace({ parameter }, `ChildProcess.spawn('${Configuration.path.rsync}', parameter) ...`)
      let process = ChildProcess.spawn(Configuration.path.rsync, parameter)

      let start = Process.hrtime()
      let progress = Process.hrtime()

      let stdout = ''
      let stderr = ''

      process.stdout.on('data', (data) => {
        // Log.trace(`ChildProcess.stdout.on('data', (data) => { ... } '${Path.trim(this.sourcePath[0])}'`)

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
      
      process.stderr.on('data', (data) => {
        // Log.trace(`ChildProcess.stderr.on('data', (data) => { ... } '${Path.trim(this.sourcePath[0])}'`)
        let dataAsString = data.toString()
        stderr += dataAsString.toString()
      })

      process.on('error', (error) => {

        if (!isResolved && !isRejected) {

          Log.trace(error, `ChildProcess.on('error'), (error) => { ... }) ${Configuration.conversion.toDuration(Process.hrtime(start)).toFormat(Configuration.format.longDuration)}`)

          isRejected = true
          reject(new ArchiveRunError())

        }

      })
      
      process.on('exit', (code, signal) => {

        if (!isResolved && !isRejected) {

          Log.trace(`ChildProcess.on('exit'), (${code}, ${Is.not.null(signal) ? '${signal}' : signal}) => { ... }) ${Configuration.conversion.toDuration(Process.hrtime(start)).toFormat(Configuration.format.longDuration)}`)
          if (Is.not.emptyString(stdout)) Log.trace(`\n\n${stdout}`)

          if (code == 0) {
            
            let statistic = Archive.getStatistic(stdout)

            Log.debug(`Archived to '${Path.trim(this.targetPath)}'`)
            Log.debug(`Scanned ${statistic.countOfScanned} paths, created ${statistic.countOfCreated} paths, updated ${statistic.countOfUpdated} paths${statistic.countOfDeleted ? `, deleted ${statistic.countOfDeleted} paths` : ''}`)
  
            isResolved = true
            resolve({ stamp, statistic })

          }
          else {
  
            if (Is.not.emptyString(stderr)) Log.debug(`\n\n${stderr}`)
  
            isRejected = true
            reject(new ArchiveRunError())
    
          }
          
        }

      })

    }
    catch (error) {

      if (!isResolved && !isRejected) {

        isRejected = true
        reject(error)

      }

    }

  })

}

archivePrototype.purge = async function () {
  Log.trace('Archive.purge()')

  return Archive.purge(this.targetPath)
  
}

const Archive = Object.create({})

Archive.createArchive = function (sourcePath, targetPath, includePath = [], excludePath = [], prototype = archivePrototype) {
  Log.trace({ sourcePath, targetPath, includePath, excludePath }, 'Archive.createArchive(sourcePath, targetPath, includePath, excludePath, prototype)')

  let archive = Object.create(prototype)

  archive.sourcePath = Is.array(sourcePath) ? sourcePath : [ sourcePath ]
  archive.targetPath = targetPath
  archive.includePath = Is.array(includePath) ? includePath : [ includePath ]
  archive.excludePath = Is.array(excludePath) ? excludePath : [ excludePath ]

  archive.id = UUID()
  archive.job = null

  return archive

}

Archive.getArchivePrototype = function () {
  return archivePrototype
}

Archive.isArchive = function (archive) {
  return archivePrototype.isPrototypeOf(archive)
}

Archive.getStatistic = function (stdout) {

  return {
    'countOfScanned': this.getCountOfScanned(stdout),
    'countOfCreated': this.getCountOfCreated(stdout),
    'countOfUpdated': this.getCountOfUpdated(stdout),
    'countOfDeleted': this.getCountOfDeleted(stdout)
  }

}

Archive.getCountOfScanned = function (stdout) {

  let pattern = Configuration.pattern.countOfScanned
  let match = null

  if (Is.not.null(match = pattern.exec(stdout))) {
  
    let [ , countOfScannedAsString ] = match
    let countOfScanned = parseInt(countOfScannedAsString.replace(/,/g, ''))

    return countOfScanned

  }

  return null

}

Archive.getCountOfCreated = function (stdout) {

  let pattern = Configuration.pattern.countOfCreated
  let match = null

  if (Is.not.null(match = pattern.exec(stdout))) {
  
    let [ , countOfCreatedAsString ] = match
    let countOfCreated = parseInt(countOfCreatedAsString.replace(/,/g, ''))

    return countOfCreated

  }

  return null

}

Archive.getCountOfUpdated = function (stdout) {

  let pattern = Configuration.pattern.countOfUpdated
  let match = null

  if (Is.not.null(match = pattern.exec(stdout))) {
  
    let [ , countOfUpdatedAsString ] = match
    let countOfUpdated = parseInt(countOfUpdatedAsString.replace(/,/g, ''))

    return countOfUpdated

  }

  return null

}

Archive.getCountOfDeleted = function (stdout) {

  let pattern = Configuration.pattern.countOfDeleted
  let match = null

  if (Is.not.null(match = pattern.exec(stdout))) {
  
    let [ , countOfDeletedAsString ] = match
    let countOfDeleted = parseInt(countOfDeletedAsString.replace(/,/g, ''))

    return countOfDeleted

  }

  return null

}

export default Archive
