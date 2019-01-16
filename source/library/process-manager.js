import Is from '@pwn/is'
import { Log, Path } from '@virtualpatterns/mablung'
import _ProcessManager from 'pm2'
import Utilities from 'util'

import Configuration from '../configuration'
import Package from '../../package.json'

const ProcessManager = Object.create(_ProcessManager)

ProcessManager.connect = Utilities.promisify(ProcessManager.connect)
ProcessManager.start = Utilities.promisify(ProcessManager.start)
ProcessManager.describe = Utilities.promisify(ProcessManager.describe)
ProcessManager.stop = Utilities.promisify(ProcessManager.stop)
ProcessManager.restart = Utilities.promisify(ProcessManager.restart)
ProcessManager.delete = Utilities.promisify(ProcessManager.delete)
ProcessManager.killDaemon = Utilities.promisify(ProcessManager.killDaemon)

ProcessManager.startArchive = async function () {

  await this.connect()

  try {

    try {

      let options = {
        'apps': [
          {
            'name': Package.name,
            'script': Path.normalize(`${__dirname}../../lotho.js`),
            // 'cwd': Path.normalize(`${Process.env.HOME}/.lotho`),
            'args': [ 
              '--configurationPath', Configuration.path.configuration,
              '--logLevel', Configuration.logLevel,
              '--logPath', Configuration.logPath,
              'run-schedule' 
            ]
          }
        ]
      }
  
      Log.trace(options, 'ProcessManager.start(options)')
      await this.start(options)

      await this._logStatusOfArchive()

    }
    catch(error) {
      throw Is.array(error) ? error[0] : error
    } 

  }
  finally {
    await this.disconnect()
  }

}

ProcessManager.logStatusOfArchive = async function () {

  await this.connect()

  try {

    try {
      await this._logStatusOfArchive()
    }
    catch(error) {
      throw Is.array(error) ? error[0] : error
    } 

  }
  finally {
    await this.disconnect()
  }

}

ProcessManager._logStatusOfArchive = async function () {

  Log.trace(`ProcessManager.describe('${Package.name}')`)
  let [ status ] = await this.describe(Package.name)
  // Log.trace({ status }, `ProcessManager.describe('${Package.name}')`)

  Log.debug(`Name: '${status.name}'`)
  Log.debug(`PID: ${status.pid}`)
  Log.debug(`Status: '${status.pm2_env.status}'`)
  Log.debug(`Script: '${status.pm2_env.pm_exec_path}'`)
  Log.debug(`Working Directory: '${status.pm2_env.pm_cwd}'`)
  Log.debug(`stderr: '${status.pm2_env.pm_err_log_path}'`)
  Log.debug(`stdout: '${status.pm2_env.pm_out_log_path}'`)
  Log.debug(`Restarts: '${status.pm2_env.unstable_restarts}'`)

}

ProcessManager.stopArchive = async function () {

  await this.connect()

  try {

    Log.trace(`ProcessManager.stop('${Package.name}')`)
    await this.stop(Package.name)

    Log.trace(`ProcessManager.delete('${Package.name}')`)
    await this.delete(Package.name)

  }
  finally {
    await this.disconnect()
  }

}

// ProcessManager.kill = async function () {

//   await this.connect()

//   try {
//     Log.trace('ProcessManager.killDaemon()')
//     await ProcessManager.destroy() // killDaemon()
//   }
//   finally {
//     await this.disconnect()
//   }

// }

export default ProcessManager
