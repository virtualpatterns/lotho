import { DateTime } from 'luxon'
import { Log, FileSystem, Path, Process } from '@virtualpatterns/mablung'
import Connection from 'ssh2-sftp-client'

import Archive from '../archive'
import Configuration from '../../configuration'
import Is from '../is'

const archivePrototype = Archive.getArchivePrototype()
const remotePrototype = Object.create(archivePrototype)

remotePrototype.connect = async function () {

  if (Is.null(this.connection)) {

    let pattern = Configuration.pattern.remotePath
    let match = pattern.exec(this.option.path.target)
    
    let [ , computerName ] = match
  
    let privateKey = await FileSystem.readFile(Configuration.path.privateKey, { 'encoding': 'utf-8' })
  
    this.connection = new Connection()
    await this.connection.connect({ 'host': computerName, 'username': Process.env.USER, 'privateKey': privateKey })

  }

}

remotePrototype.disconnect = async function () {

  if (Is.not.null(this.connection)) {

    await this.connection.end()
    this.connection = null
  
  }

}

remotePrototype.purge = async function (stamp) {

  await this.connect()

  try {

    let pattern = Configuration.pattern.remotePath
    let match = pattern.exec(this.option.path.target)
    
    let [ , , targetPath ] = match

    let current = stamp
    let previous = null
    
    previous = await this.connection.list(targetPath)
    previous = previous
      .filter((information) => information.type == 'd')
      .map((information) => information.name)
      .map((name) => DateTime.fromFormat(name, Configuration.format.stamp, { 'zone': 'local' }))
      .filter((dateTime) => dateTime.isValid)
      .sort((dateTime1, dateTime2) => dateTime1 < dateTime2 ? -1 : ( dateTime1 > dateTime2 ? 1 : 0 ))

    let expired = previous
      .map((dateTime, index, previous) => ({ 'previous': dateTime, 'next': previous[index + 1] }))
      .filter(({ next }) => next)
      .filter(({ previous, next }) => Remote.isExpired(current, previous, next))
      .map(({ previous }) => previous)

    await Promise.all(expired
      .map((previous) => {
        Log.debug(`Deleting '${previous.toFormat(Configuration.format.stamp)}' ...`)
        return this.connection.rmdir(Path.join(targetPath, previous.toFormat(Configuration.format.stamp)), true)
      }))

    // for (let previous of expired) {
    //   Log.debug(`Deleting '${previous.toFormat(Configuration.format.stamp)}' ...`)
    //   await this.connection.rmdir(Path.join(targetPath, previous.toFormat(Configuration.format.stamp)), true)
    // }
  
    return { 'countOfPurged': expired.length }

  }
  finally {
    await this.disconnect()
  }

}

const Remote = Object.create(Archive)

Remote.createArchive = function (option, prototype = remotePrototype) {

  let archive = Archive.createArchive.call(this, option, prototype)

  archive.connection = null

  return archive

}

Remote.getArchivePrototype = function () {
  return remotePrototype
}

Remote.isArchive = function (remote) {
  return remotePrototype.isPrototypeOf(remote)
}

Remote.isArchiveClass = function (option) {
  return Configuration.pattern.remotePath.test(option.path.target)
}

export default Remote
