import { DateTime } from 'luxon'
import { FileSystem, Log, Path } from '@virtualpatterns/mablung'
import Merge from 'deepmerge'

import Configuration from '../../configuration'

import Archive from '../archive'

const archivePrototype = Archive.getArchivePrototype()
const localPrototype = Object.create(archivePrototype)

localPrototype.getSynchronizeStatistic = function (stdout) {
  return Merge(archivePrototype.getSynchronizeStatistic.call(this, stdout), { 'countOfDeleted': Local.getCountOfDeleted(stdout) })
}

localPrototype.purge = async function (stamp) {

  let current = stamp
  let previous = null

  previous = await FileSystem.readdir(this.option.path.target, { 'encoding': 'utf-8', 'withFileTypes': true })
  previous = previous
    .filter((path) => path.isDirectory())
    .map((path) => path.name)
    .map((name) => DateTime.fromFormat(name, Configuration.format.stamp, { 'zone': 'local' }))
    .filter((dateTime) => dateTime.isValid)
    .sort((dateTime1, dateTime2) => dateTime1 < dateTime2 ? -1 : ( dateTime1 > dateTime2 ? 1 : 0 ))

  let expired = previous
    .map((dateTime, index, previous) => ({ 'previous': dateTime, 'next': previous[index + 1] }))
    .filter(({ next }) => next)
    .filter(({ previous, next }) => Local.isExpired(current, previous, next))
    // .map(({ previous }) => previous)

  // await Promise.all(expired
  //   .map((previous) => {
  //     Log.debug(`Deleting '${previous.toFormat(Configuration.format.stamp)}' ...`)
  //     return FileSystem.remove(Path.join(this.option.path.target, previous.toFormat(Configuration.format.stamp)))
  //   }))

  for (let _expired of expired) {

    let previousPath = Path.join(this.option.path.target, _expired.previous.toFormat(Configuration.format.stamp))
    let nextPath = Path.join(this.option.path.target, _expired.next.toFormat(Configuration.format.stamp))

    Log.debug(`Deleting '${Path.basename(previousPath)}' ...`)

    await FileSystem.copy(previousPath, nextPath, { 'overwrite': false })
    await FileSystem.remove(previousPath)

  }

  return { 'countOfPurged': expired.length }

}

const Local = Object.create(Archive)

Local.createArchive = function (option, prototype = localPrototype) {
  return Archive.createArchive.call(this, option, prototype)
}

Local.getArchivePrototype = function () {
  return localPrototype
}

Local.isArchive = function (local) {
  return localPrototype.isPrototypeOf(local)
}

Local.isArchiveClass = function (option) {
  return !Configuration.pattern.remotePath.test(option.path.target)
}

Local.getCountOfDeleted = function (stdout) {
  return this.getIntegerStatistic(Configuration.pattern.countOfDeleted, stdout)
}

export default Local
