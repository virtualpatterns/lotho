import { Log } from '@virtualpatterns/mablung'
import _ProcessManager from 'pm2'
import Utility from 'util'

import Configuration from '../configuration'
import Is from './utility/is'

const processManagerPrototype = Object.create(_ProcessManager)

processManagerPrototype.connect = Utility.promisify(processManagerPrototype.connect)
processManagerPrototype.start = Utility.promisify(processManagerPrototype.start)
processManagerPrototype.describe = Utility.promisify(processManagerPrototype.describe)
processManagerPrototype.stop = Utility.promisify(processManagerPrototype.stop)
processManagerPrototype.restart = Utility.promisify(processManagerPrototype.restart)
processManagerPrototype.delete = Utility.promisify(processManagerPrototype.delete)

processManagerPrototype.startArchive = async function () {

  try {

    let option = Configuration.getOption({
      'name': this.option.name,
      'script': Configuration.path.start,
      'args': Configuration.getParameter({
        '--configuration-path': Configuration.path.configuration,
        '--log-level': Configuration.logLevel,
        '--log-path': 'console',
        'run-schedule': this.option.name
      }, Configuration.parameter.start)
    }, Configuration.option.start)

    Log.debug(`Starting '${option.name}' ...`)

    let [ process ] = await this.start(option)

    Log.debug(`  Name: '${process.pm2_env.name}'`)
    Log.debug(`  PID: ${process.pid}`)
    Log.debug(`  Status: '${process.pm2_env.status}'`)
    Log.debug(`  Script: '${process.pm2_env.pm_exec_path}'`)
    Log.debug(`  Working Directory: '${process.pm2_env.pm_cwd}'`)
    Log.debug(`  stderr: '${process.pm2_env.pm_err_log_path}'`)
    Log.debug(`  stdout: '${process.pm2_env.pm_out_log_path}'`)

    return process
    
  }
  catch(error) {
    throw Is.array(error) ? error[0] : error
  } 

}

processManagerPrototype.stopArchive = async function () {

  Log.debug(`Stopping '${this.option.name}' ...`)

  await this.stop(this.option.name)
  await this.delete(this.option.name)

}

processManagerPrototype.restartArchive = async function () {

  Log.debug(`Restarting '${this.option.name}' ...`)

  await this.restart(this.option.name)

}

processManagerPrototype.getArchivePID = async function (name) {
  let [ status ] = await this.describe(name)
  return status ? status.pid : null
}

processManagerPrototype.close = function () {
  return this.disconnect()
}

const ProcessManager = Object.create({})

ProcessManager.openProcessManager = async function (option, prototype = processManagerPrototype) {

  let processManager = Object.create(prototype)

  processManager.option = option
  await processManager.connect()

  return processManager

}

ProcessManager.getProcessManagerPrototype = function () {
  return processManagerPrototype
}

ProcessManager.isProcessManager = function (processManager) {
  return processManagerPrototype.isPrototypeOf(processManager)
}

export default ProcessManager
