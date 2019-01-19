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

archivePrototype.startSchedule = function () {
  Log.trace('Archive.startSchedule()')

  this.job.start()
    
  Process.once('SIGINT', this.SIGINT = () => {
    Log.trace('Process.once(\'SIGINT\', () => { ... })')
    this.stopSchedule()
  })

  Process.once('SIGTERM', this.SIGTERM = () => {
    Log.trace('Process.once(\'SIGTERM\', () => { ... })')
    this.stopSchedule()
  })

  Log.debug(`Next scheduled archive ${this.getNextRun().toFormat(Configuration.format.longSchedule)}`)

}

archivePrototype.getNextRun = function () {
  return DateTime.fromJSDate(this.job.nextDates(1)[0].toDate())
}

archivePrototype.stopSchedule = function () {
  Log.trace('Archive.stopSchedule()')

  Process.off('SIGTERM', this.SIGTERM)
  Process.off('SIGINT', this.SIGINT)

  this.job.stop()
    
}

archivePrototype.runOnce = function () {
  Log.trace('Archive.runOnce()')

  return new Promise(async (resolve, reject) => {

    let isRejected = false
    let isResolved = false

    let stamp = Configuration.now().toFormat(Configuration.format.stamp)

    try {
    
      let parameter = [
        ...Configuration.getParameter(Configuration.parameter.rsync),
        `--backup-dir=../${stamp}`, // ${Path.join(this.targetPath.replace(/^[^:]+:/, ''), stamp)}`,
        ...this.excludePath.map((path) => `--exclude=${path}`),
        ...this.sourcePath.map((path) => `${path}/`), // ...this.sourcePath
        Path.join(this.targetPath, 'content')
      ]
      
      let option = {}

      Log.trace({ parameter }, `ChildProcess.spawn('${Configuration.path.rsync}', parameter, option) ...`)
      let process = ChildProcess.spawn(Configuration.path.rsync, parameter, option)

      let start = Process.hrtime()
      let progress = Process.hrtime()

      let stdout = ''
      let stderr = ''

      process.stdout.on('data', (data) => {

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
        let dataAsString = data.toString()
        stderr += dataAsString.toString()
      })

      process.on('error', (error) => {

        if (!isResolved && !isRejected) {

          delete error.name
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
            
            let statistics = Archive.getStatistics(stdout)

            Log.debug(`Scanned: ${statistics.countOfScanned}`)
            Log.debug(`Created: ${statistics.countOfCreated}`)
            Log.debug(`Updated: ${statistics.countOfUpdated}`)

            if (statistics.countOfDeleted) {
              Log.debug(`Deleted: ${statistics.countOfDeleted}`)
            }
  
            isResolved = true
            resolve({ stamp, statistics })

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

archivePrototype.onScheduled = async function () {

  try {

    await FileSystem.mkdir(Path.dirname(this.lockPath), { 'recursive': true })
    await FileSystem.writeFile(this.lockPath, '', { 'encoding': 'utf8', 'flag': 'wx' })

    Log.debug(Configuration.line)
    Log.trace('Archive.onScheduled()')
  
    try {

      let result = await this.runOnce()
      result.nextRun = this.getNextRun()

      Log.debug(`Next scheduled archive ${result.nextRun.toFormat(Configuration.format.longSchedule)}`)

      this.emit('completed', result)

    }
    catch (error) {
      delete error.name
      Log.trace(error, 'catch (error) { ... })')
    }
    finally {
      await FileSystem.unlink(this.lockPath)
    }
      
  }
  catch (error) {
    Log.trace(error, 'catch (error) { ... })')
  }

}

archivePrototype.onStopped = function () {
  Log.trace('Archive.onStopped()')
}

const Archive = Object.create({})

Archive.createArchive = function (sourcePath = Configuration.path.source, targetPath = Configuration.path.target, excludePath = Configuration.path.exclude, schedule = Configuration.schedule, prototype = archivePrototype) {
  Log.trace({ sourcePath, targetPath, excludePath, schedule }, 'Archive.createArchive(sourcePath, targetPath, excludePath, schedule, prototype)')

  let archive = Object.create(prototype)

  archive.lockPath = Path.join(Configuration.path.home, `${UUID()}.lock`)
  archive.sourcePath = Is.array(sourcePath) ? sourcePath : [ sourcePath ]
  archive.targetPath = targetPath
  archive.excludePath = Is.array(excludePath) ? excludePath : [ excludePath ]

  archive.job = new Job(schedule, archive.onScheduled.bind(archive), archive.onStopped.bind(archive)) // , false, Configuration.timeZone)

  return archive

}

Archive.getArchivePrototype = function () {
  return archivePrototype
}

Archive.isArchive = function (archive) {
  return archivePrototype.isPrototypeOf(archive)
}

Archive.getStatistics = function (stdout) {

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
