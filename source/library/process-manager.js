// import ChildProcess from 'child_process'
import Is from '@pwn/is'
import { Log, Path } from '@virtualpatterns/mablung'
import _ProcessManager from 'pm2'
import Sanitize from 'sanitize-filename'
import Utilities from 'util'

import Configuration from '../configuration'

const ProcessManager = Object.create(_ProcessManager)

ProcessManager.connect = Utilities.promisify(ProcessManager.connect)
ProcessManager.start = Utilities.promisify(ProcessManager.start)
ProcessManager.describe = Utilities.promisify(ProcessManager.describe)
ProcessManager.stop = Utilities.promisify(ProcessManager.stop)
ProcessManager.delete = Utilities.promisify(ProcessManager.delete)

ProcessManager.startArchive = async function (option) {

  await this.connect()

  try {

    try {

      let logPath = Configuration.logPath

      let logParentPath = Path.dirname(logPath)
      let logExtension = Path.extname(logPath)
      let logName = `${Path.basename(logPath, logExtension)}-${Sanitize(option.name)}`

      let _option = {
        'apps': [
          {
            'name': option.name,
            'script': Configuration.path.start,
            'args': [
              ...Configuration.conversion.toParameter(Configuration.parameter.start),
              '--configurationPath', Configuration.path.configuration,
              '--logLevel', Configuration.logLevel,
              '--logPath', Path.join(logParentPath, `${logName}${logExtension}`),
              'run-schedule', option.name
            ]
          }
        ]
      }
  
      Log.debug(`Starting '${option.name}' ...`)

      Log.trace({ _option }, 'ProcessManager.start(_option)')
      let [ process ] = await this.start(_option)

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

ProcessManager.stopArchive = async function (option) {

  await this.connect()

  try {

    Log.debug(`Stopping '${option.name}' ...`)

    Log.trace(`ProcessManager.stop('${option.name}')`)
    await this.stop(option.name)

    Log.trace(`ProcessManager.delete('${option.name}')`)
    await this.delete(option.name)

  }
  finally {
    await this.disconnect()
  }

}

ProcessManager.getPID = async function (name) {

  await this.connect()

  try {

    Log.trace(`ProcessManager.describe('${name}') ...`)
    let [ status ] = await this.describe(name)

    return status ? status.pid : null

  }
  finally {
    await this.disconnect()
  }

}

export default ProcessManager
