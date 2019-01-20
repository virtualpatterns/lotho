// import ChildProcess from 'child_process'
import Is from '@pwn/is'
import { Log } from '@virtualpatterns/mablung'
import _ProcessManager from 'pm2'
import Utilities from 'util'

import Configuration from '../configuration'

const ProcessManager = Object.create(_ProcessManager)

ProcessManager.connect = Utilities.promisify(ProcessManager.connect)
ProcessManager.start = Utilities.promisify(ProcessManager.start)
ProcessManager.describe = Utilities.promisify(ProcessManager.describe)
ProcessManager.stop = Utilities.promisify(ProcessManager.stop)
ProcessManager.delete = Utilities.promisify(ProcessManager.delete)

ProcessManager.startArchive = async function (name) {

  await this.connect()

  try {

    try {

      let option = {
        'apps': [
          {
            'name': name,
            'script': Configuration.path.start,
            'args': [
              ...Configuration.conversion.toParameter(Configuration.parameter.start),
              'run-schedule', name
            ]
          }
        ]
      }
  
      Log.trace({ option }, 'ProcessManager.start(option)')
      let [ process ] = await this.start(option)

      Log.debug('ProcessManager.start(option)')
      Log.debug(`Name: '${process.pm2_env.name}'`)
      Log.debug(`PID: ${process.pid}`)
      Log.debug(`Status: '${process.pm2_env.status}'`)
      Log.debug(`Script: '${process.pm2_env.pm_exec_path}'`)
      Log.debug(`Working Directory: '${process.pm2_env.pm_cwd}'`)
      Log.debug(`stderr: '${process.pm2_env.pm_err_log_path}'`)
      Log.debug(`stdout: '${process.pm2_env.pm_out_log_path}'`)

      return process
      
    }
    catch(error) {
      throw Is.array(error) ? error[0] : error
    } 

  }
  finally {
    await this.disconnect()
  }

}

ProcessManager.stopArchive = async function (name) {

  await this.connect()

  try {

    Log.trace(`ProcessManager.stop('${name}')`)
    await this.stop(name)

    Log.trace(`ProcessManager.delete('${name}')`)
    await this.delete(name)

  }
  finally {
    await this.disconnect()
  }

}

ProcessManager.getPID = async function (name) {

  await this.connect()

  try {

    Log.trace(`ProcessManager.describe('${name}')`)
    let [ status ] = await this.describe(name)

    return status ? status.pid : null

  }
  finally {
    await this.disconnect()
  }

}

export default ProcessManager
