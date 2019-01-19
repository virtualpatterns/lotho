// import ChildProcess from 'child_process'
import Is from '@pwn/is'
import { Log } from '@virtualpatterns/mablung'
import _ProcessManager from 'pm2'
import Utilities from 'util'

import Configuration from '../configuration'
import Package from '../../package.json'

const ProcessManager = Object.create(_ProcessManager)

ProcessManager.connect = Utilities.promisify(ProcessManager.connect)
ProcessManager.start = Utilities.promisify(ProcessManager.start)
ProcessManager.stop = Utilities.promisify(ProcessManager.stop)
ProcessManager.delete = Utilities.promisify(ProcessManager.delete)

ProcessManager.startArchive = async function () {

  await this.connect()

  try {

    try {

      let option = {
        'apps': [
          {
            'name': Configuration.startName,
            'script': Configuration.path.start,
            'args': Configuration.getParameter(Configuration.parameter.start)
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

// ProcessManager.outputStatusOfArchive = async function () {

//   await this.connect()

//   try {

//     try {
//       await this._outputStatusOfArchive()
//     }
//     catch(error) {
//       throw Is.array(error) ? error[0] : error
//     } 

//   }
//   finally {
//     await this.disconnect()
//   }

// }

// ProcessManager._outputStatusOfArchive = async function () {

//   Log.trace(`ProcessManager.describe('${Package.name}')`)
//   let [ status ] = await this.describe(Package.name)
//   // Log.trace({ status }, `ProcessManager.describe('${Package.name}')`)

//   Log.debug(`Name: '${status.name}'`)
//   Log.debug(`PID: ${status.pid}`)
//   Log.debug(`Status: '${status.pm2_env.status}'`)
//   Log.debug(`Script: '${status.pm2_env.pm_exec_path}'`)
//   Log.debug(`Working Directory: '${status.pm2_env.pm_cwd}'`)
//   Log.debug(`stderr: '${status.pm2_env.pm_err_log_path}'`)
//   Log.debug(`stdout: '${status.pm2_env.pm_out_log_path}'`)
//   Log.debug(`Restarts: '${status.pm2_env.unstable_restarts}'`)

// }

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

// ProcessManager.execute = function (parameter) {

//   return new Promise((resolve, reject) => {

//     parameter = [
//       ...Object.keys(Configuration.parameter.pm2).filter((name) => Configuration.parameter.pm2[name]),
//       ...parameter
//     ]

//     /*
//     -s –silent 	hide all messages
//     -m –mini-list 	display a compacted list without formatting
//     */

//     let option = { 'stdio': 'inherit' }

//     let process = ChildProcess.fork(Configuration.path.pm2, parameter, option)

//     process.on('exit', () => {
//       resolve()
//     })

//   })

// }

export default ProcessManager
