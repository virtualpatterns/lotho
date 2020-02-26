import { DateTime } from 'luxon'
import { Log, FileSystem, Path } from '@virtualpatterns/mablung'
import SFTP from 'ssh2-sftp-client'
import OS from 'os'

import Configuration from '../../configuration'
import Is from '../utility/is'
import Purged from './purged'

import { RemoteConnectError, RemoteCopyError, RemoteDeleteError } from '../error/remote-error'

const purgePrototype = Purged.getArchivePrototype()
const remotePrototype = Object.create(purgePrototype)

remotePrototype.connect = async function () {

  let pattern = Configuration.pattern.remotePath
  let match = pattern.exec(this.option.path.target)
  
  let [ , computerName ] = match

  let userInformation = OS.userInfo({ 'encoding': 'utf-8' })
  let privateKey = await FileSystem.readFile(Configuration.path.privateKey, { 'encoding': 'utf-8' })

  let option = Configuration.getOption({ 
    'host': computerName, 
    'username': userInformation.username, 
    'privateKey': privateKey //, 
    // 'debug': Log.trace.bind(Log)
  }, Configuration.option.SFTP)
      
  this.connection = new SFTP()

  try {
    Log.trace(Configuration.redact(option), 'Remote.connect(option) ...')
    await this.connection.connect(option)
  }
  catch (error) {
    throw new RemoteConnectError(error)
  }

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

remotePrototype.copyExpired = async function (previous, next) {

  let pattern = Configuration.pattern.remotePath
  let match = pattern.exec(this.option.path.target)
  
  let [ , , targetPath ] = match
  let separator = Remote.getSeparator(targetPath)
  let previousPath = `${targetPath}${separator}${previous.toFormat(Configuration.format.stamp)}`
  let nextPath = `${targetPath}${separator}${next.toFormat(Configuration.format.stamp)}`
  
  let items = await this.connection.list(previousPath)

  for (let item of items) {

    await new Promise((resolve, reject) => {

      Log.trace(`SFTP.exec('cp -Rnpv "${previousPath}${separator}${item.name}" "${nextPath}${separator}"', (error, stream) => { ... })`)
      this.connection.client.exec(`cp -Rnpv "${previousPath}${separator}${item.name}" "${nextPath}${separator}"`, (error, stream) => {

        if (error) {
          Log.error(error, `SFTP.exec('cp -Rnpv "${previousPath}/${item.name}" "${nextPath}${separator}"'), (error, stream) => { ... })`)
          reject(new RemoteCopyError(error))
        }
        else {

          let stdout = ''
          let stderr = ''
    
          stream.stdout.on('data', (data) => {
            stdout += data
          })
          
          stream.stderr.on('data', (data) => {
            stderr += data
          })

          stream.once('close', (code) => {

            if (Is.not.emptyString(stdout)) Log.trace(`\n\n${stdout}`)
            if (Is.not.emptyString(stderr)) Log.error(`\n\n${stderr}`)

            if ([ 0, 1 ].includes(code)) {
              resolve()
            }
            else {
              if (Is.not.emptyString(stderr)) Log.error(`\n\n${stderr}`)
              reject(new RemoteCopyError(stderr))
            }

          })

        }

      })

    })

  }

}

// remotePrototype.deleteExpired = function (previous) {

//   let pattern = Configuration.pattern.remotePath
//   let match = pattern.exec(this.option.path.target)
  
//   let [ , , targetPath ] = match
//   let previousPath = Path.join(targetPath, previous.toFormat(Configuration.format.stamp))

//   Log.debug(`Deleting '${Path.basename(previousPath)}' ...`)
//   return this.connection.rmdir(previousPath, true)

// }

remotePrototype.deleteExpired = function (previous) {

  return new Promise((resolve, reject) => {

    let pattern = Configuration.pattern.remotePath
    let match = pattern.exec(this.option.path.target)
    
    let [ , , targetPath ] = match
    let separator = Remote.getSeparator(targetPath)
    let previousPath = `${targetPath}${separator}${previous.toFormat(Configuration.format.stamp)}`
  
    Log.debug(`Deleting '${Path.basename(previousPath)}' ...`)

    Log.trace(`SFTP.exec('rm -Rv "${previousPath}"', (error, stream) => { ... })`)
    this.connection.client.exec(`rm -Rv "${previousPath}"`, (error, stream) => {

      if (error) {
        Log.error(error, `SFTP.exec('rm -Rv "${previousPath}"', (error, stream) => { ... })`)
        reject(new RemoteDeleteError(previousPath, error))
      }
      else {

        let stdout = ''
        let stderr = ''
  
        stream.stdout.on('data', (data) => {
          stdout += data
        })
        
        stream.stderr.on('data', (data) => {
          stderr += data
        })

        stream.once('close', (code) => {

          if (Is.not.emptyString(stdout)) Log.trace(`\n\n${stdout}`)

          if ([ 0 ].includes(code)) {
            resolve()
          }
          else {
            if (Is.not.emptyString(stderr)) Log.error(`\n\n${stderr}`)
            reject(new RemoteDeleteError(previousPath, stderr))
          }

        })

      }

    })

  })

}

remotePrototype.disconnect = async function () {

  await this.connection.end()
  this.connection = null

}

remotePrototype.archive = async function (stamp = Configuration.now()) {

  await this.connect()

  try {
    return await purgePrototype.archive.call(this, stamp)
  }
  finally {
    await this.disconnect()
  }

}

const Remote = Object.create(Purged)

Remote.createArchive = function (option, prototype = remotePrototype) {
  return Purged.createArchive.call(this, option, prototype)
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
