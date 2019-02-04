import { DateTime } from 'luxon'
import { Log, FileSystem, Path } from '@virtualpatterns/mablung'
import Connection from 'ssh2-sftp-client'
import OS from 'os'

import Archive from '../archive'
import Configuration from '../../configuration'
import Is from '../is'

import { ArchivePurgeError } from '../error/archive-error'

const archivePrototype = Archive.getArchivePrototype()
const remotePrototype = Object.create(archivePrototype)

remotePrototype.connect = async function () {

  let pattern = Configuration.pattern.remotePath
  let match = pattern.exec(this.option.path.target)
  
  let [ , computerName ] = match

  let userInformation = OS.userInfo({ 'encoding': 'utf-8' })
  let privateKey = await FileSystem.readFile(Configuration.path.privateKey, { 'encoding': 'utf-8' })

  this.connection = new Connection()
  await this.connection.connect({ 'host': computerName, 'username': userInformation.username, 'privateKey': privateKey })

}

remotePrototype.getExpired = async function (current) {

  let pattern = Configuration.pattern.remotePath
  let match = pattern.exec(this.option.path.target)
  
  let [ , , targetPath ] = match
  
  return (await this.connection.list(targetPath))
    .filter((information) => information.type == 'd')
    .map((information) => information.name)
    .map((name) => DateTime.fromFormat(name, Configuration.format.stamp, { 'zone': 'local' }))
    .filter((dateTime) => dateTime.isValid)
    .sort((dateTime1, dateTime2) => dateTime1 < dateTime2 ? -1 : ( dateTime1 > dateTime2 ? 1 : 0 ))
    .map((dateTime, index, previous) => ({ 'previous': dateTime, 'next': previous[index + 1] }))
    .filter(({ next }) => next)
    .filter(({ previous, next }) => Remote.isExpired(current, previous, next))

}

remotePrototype.copyExpired = function (previous, next) {

  return new Promise((resolve, reject) => {

    let pattern = Configuration.pattern.remotePath
    let match = pattern.exec(this.option.path.target)
    
    let [ , , targetPath ] = match
    let previousPath = Path.join(targetPath, previous.toFormat(Configuration.format.stamp))
    let nextPath = Path.join(targetPath, next.toFormat(Configuration.format.stamp))
  
    Log.trace(`Connection.exec('cp -Rnp "${previousPath}/" "${nextPath}"', (error, stream) => { ... })`)
    this.connection.client.exec(`cp -Rnp "${previousPath}/" "${nextPath}"`, (error, stream) => {

      if (error) {
        Log.error(error, `Connection.exec('cp -Rnp "${previousPath}/" "${nextPath}"'), (error, stream) => { ... })`)
        reject(new ArchivePurgeError())
      }
      else {

        let stdout = ''
        let stderr = ''
  
        stream.on('data', this.onSTDOUT = (data) => {
          stdout += data
        })
        
        stream.stderr.on('data', this.onSTDERR = (data) => {
          stderr += data
        })

        stream.once('close', this.onClose = (code, signal) => {

          stream.off('close', this.onClose)
          stream.stderr.off('data', this.onSTDERR)
          stream.off('data', this.onSTDOUT)

          if (Is.not.emptyString(stdout)) Log.trace(`\n\n${stdout}`)

          if ([ 0, 1 ].includes(code)) {
            resolve()
          }
          else {
            if (Is.not.emptyString(stderr)) Log.error(`\n\n${stderr}`)
            reject(new ArchivePurgeError())
          }

        })

      }

    })

  })

}

remotePrototype.deleteExpired = function (previous) {

  let pattern = Configuration.pattern.remotePath
  let match = pattern.exec(this.option.path.target)
  
  let [ , , targetPath ] = match
  let previousPath = Path.join(targetPath, previous.toFormat(Configuration.format.stamp))

  Log.debug(`Deleting '${Path.basename(previousPath)}' ...`)
  return this.connection.rmdir(previousPath, true)

}

remotePrototype.disconnect = async function () {

  await this.connection.end()
  this.connection = null

}

remotePrototype.purge = async function (stamp) {

  await this.connect()

  try {
    return await archivePrototype.purge.call(this, stamp)
  }
  finally {
    await this.disconnect()
  }

}

const Remote = Object.create(Archive)

Remote.createArchive = function (option, prototype = remotePrototype) {
  Log.trace(option, 'Remote.createArchive(option, prototype)')
  return Archive.createArchive.call(this, option, prototype)
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
