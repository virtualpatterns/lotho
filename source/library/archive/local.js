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

localPrototype.getExpired = async function (current) {

  return (await FileSystem.readdir(this.option.path.target, { 'encoding': 'utf-8', 'withFileTypes': true }))
    .filter((path) => path.isDirectory())
    .map((path) => path.name)
    .map((name) => DateTime.fromFormat(name, Configuration.format.stamp, { 'zone': 'local' }))
    .filter((dateTime) => dateTime.isValid)
    .sort((dateTime1, dateTime2) => dateTime1 < dateTime2 ? -1 : ( dateTime1 > dateTime2 ? 1 : 0 ))
    .map((dateTime, index, previous) => ({ 'previous': dateTime, 'next': previous[index + 1] }))
    .filter(({ next }) => next)
    .filter(({ previous, next }) => Local.isExpired(current, previous, next))

}

localPrototype.copyExpired = function (previous, next) {

  let previousPath = Path.join(this.option.path.target, previous.toFormat(Configuration.format.stamp))
  let nextPath = Path.join(this.option.path.target, next.toFormat(Configuration.format.stamp))

  Log.debug(`Copying to '${Path.basename(nextPath)}' ...`)
  return FileSystem.copy(previousPath, nextPath, { 'overwrite': false })

}

localPrototype.deleteExpired = function (previous) {

  let previousPath = Path.join(this.option.path.target, previous.toFormat(Configuration.format.stamp))

  Log.debug(`Deleting '${Path.basename(previousPath)}' ...`)
  return FileSystem.remove(previousPath)

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
