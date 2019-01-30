import { assert as Assert } from 'chai'
import ChildProcess from 'child_process'
import { FileSystem, Path, Process, Log } from '@virtualpatterns/mablung'
import Sanitize from 'sanitize-filename'

import Configuration from '../configuration'
import Package from '../../package.json'
import ProcessManager from '../library/process-manager'

import { FileExistsError } from './error/test-error'

describe('lotho', function () {

  let run = function (parameter) {
    return new Promise((resolve) => {
      ChildProcess
        .fork(Configuration.test.path.lotho, [ ...Configuration.conversion.toParameter(Configuration.test.parameter.lotho), ...parameter ], { 'silent': true })
        .on('exit', (code) => {
          resolve(code)
        })
    })
  }

  let start = function (parameter) {
    return ChildProcess
      .fork(Configuration.test.path.lotho, [ ...Configuration.conversion.toParameter(Configuration.test.parameter.lotho), ...parameter ], { 'silent': true })
  }

  let stop = function (process) {
    return new Promise((resolve) => {
      process.on('exit', (code) => {
        resolve(code)
      })
      process.kill()
    })
  }

  describe('--help', function () {

    let code = null

    before(async function () {
      code = await run([ '--help' ])
    })

    it('should exit with 0', function () {
      Assert.equal(code, 0)
    })

  })

  describe('create-configuration', function () {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/create-configuration`)
    let configurationPath = `${rootPath}/configuration.json`

    let code = null

    before(async function () {
      code = await run([
        '--configurationPath', configurationPath,
        '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
        'create-configuration'
      ])
    })

    it('should exit with 0', function () {
      Assert.equal(code, 0)
    })

    it('should create the configuration file', async function () {
      Assert.isTrue(await FileSystem.pathExists(configurationPath))
    })
    
    after(function () {
      return FileSystem.remove(configurationPath)
    })

  })

  describe('run-archive [name]', function () {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/run-archive`)
    let configurationPath = `${rootPath}/configuration.json`

    let targetPath1 = `${rootPath}/1/target`
    let targetPath2 = `${rootPath}/2/target`

    describe('(when called without a name)', function () {

      let code = null

      before(async function () {
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'run-archive'
        ])
      })
  
      it('should exit with 0', function () {
        Assert.equal(code, 0)
      })
  
      it('should create the content directory', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath1}/${Configuration.name.content}`))
      })
  
      it('should create the content directory', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath2}/${Configuration.name.content}`))
      })
      
      after(function () {
        return Promise.all([
          FileSystem.remove(`${targetPath1}/${Configuration.name.content}`),
          FileSystem.remove(`${targetPath2}/${Configuration.name.content}`)
        ])
      })
  
    })

    describe('(when called with a name that fails)', function () {

      let code = null

      before(async function () {
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'run-archive', '1.5'
        ])
      })
  
      it('should exit with 2', function () {
        Assert.equal(code, 2)
      })
  
      it('should not create the content directory', async function () {
        Assert.isFalse(await FileSystem.pathExists(`${targetPath1}/${Configuration.name.content}`))
      })
  
      it('should not create the content directory', async function () {
        Assert.isFalse(await FileSystem.pathExists(`${targetPath2}/${Configuration.name.content}`))
      })
      
    })

    describe('(when called with a name that succeeds)', function () {

      let code = null

      before(async function () {
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'run-archive', '2'
        ])
      })
  
      it('should exit with 0', function () {
        Assert.equal(code, 0)
      })
  
      it('should not create the content directory', async function () {
        Assert.isFalse(await FileSystem.pathExists(`${targetPath1}/${Configuration.name.content}`))
      })
  
      it('should create the content directory', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath2}/${Configuration.name.content}`))
      })
      
      after(function () {
        return FileSystem.remove(`${targetPath2}/${Configuration.name.content}`)
      })
  
    })

  })
   
  describe('run-schedule <name>', function () {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/run-schedule`)
    let configurationPath = `${rootPath}/configuration.json`
    let targetPath = `${rootPath}/target`

    let process = null

    before(function () {
      process = start([
        '--configurationPath', configurationPath,
        '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
        'run-schedule', Package.name
      ])
    })

    it('should create the content directory', function () {
      return FileSystem.whenFileExists(1000, 20000, `${targetPath}/${Configuration.name.content}`)
    })
    
    after(async function () {
      await stop(process)
      await FileSystem.remove(`${targetPath}/${Configuration.name.content}`)
    })

  })
   
  describe('start-archive [name]', function () {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/start-archive`)
    let configurationPath = `${rootPath}/configuration.json`

    let targetPath1 = `${rootPath}/1/target`
    let targetPath2 = `${rootPath}/2/target`

    describe('(when called without a name)', function () {

      let code = null
      let pid1 = null
      let pid2 = null

      before(async function () {
        
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'start-archive'
        ])

        pid1 = await ProcessManager.getPID('1')
        pid2 = await ProcessManager.getPID('2')

      })
  
      it('should exit with 0', function () {
        Assert.equal(code, 0)
      })
  
      it('should be a valid pid', function () {
        Log.debug(pid1)
        Process.kill(pid1, 0)
      })

      it('should create the content directory', function () {
        return FileSystem.whenFileExists(1000, 20000, `${targetPath1}/${Configuration.name.content}`)
      })
 
      it('should be a valid pid', function () {
        Process.kill(pid2, 0)
      })
 
      it('should create the content directory', function () {
        return FileSystem.whenFileExists(1000, 20000, `${targetPath2}/${Configuration.name.content}`)
      })
      
      after(async function () {

        await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'stop-archive'
        ])

        let logPath = Configuration.logPath

        let logParentPath = Path.dirname(logPath)
        let logExtension = Path.extname(logPath)

        for (let name of ['1', '1.5', '2']) {
          await FileSystem.remove(Path.join(logParentPath, `${Path.basename(logPath, logExtension)}-${Sanitize(name)}${logExtension}`))
        }

        await Promise.all([
          FileSystem.remove(`${targetPath1}/${Configuration.name.content}`),
          FileSystem.remove(`${targetPath2}/${Configuration.name.content}`)
        ])

      })
  
    })

    describe('(when called with a name)', function () {

      let pid1 = null
      let pid2 = null
      let code = null

      before(async function () {

        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'start-archive', '2'
        ])

        pid1 = await ProcessManager.getPID('1')
        pid2 = await ProcessManager.getPID('2')

      })
  
      it('should exit with 0', function () {
        Assert.equal(code, 0)
      })
  
      it('should not be a valid pid', function () {
        Assert.throws(() => Process.kill(pid1, 0))
      })

      it('should not create the content directory', function (complete) {
        setTimeout(function () {
          complete(FileSystem.pathExistsSync(`${targetPath1}/${Configuration.name.content}`) ? new FileExistsError(`${targetPath1}/${Configuration.name.content}`) : undefined)
        }, 9000)
      })
 
      it('should be a valid pid', function () {
        Process.kill(pid2, 0)
      })
 
      it('should create the content directory', function () {
        return FileSystem.whenFileExists(1000, 20000, `${targetPath2}/${Configuration.name.content}`)
      })
      
      after(async function () {

        await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'stop-archive', '2'
        ])

        let logPath = Configuration.logPath

        let logParentPath = Path.dirname(logPath)
        let logExtension = Path.extname(logPath)

        for (let name of ['2']) {
          await FileSystem.remove(Path.join(logParentPath, `${Path.basename(logPath, logExtension)}-${Sanitize(name)}${logExtension}`))
        }

        await FileSystem.remove(`${targetPath2}/${Configuration.name.content}`)

      })
  
    })

  })
   
  describe('stop-archive [name]', function () {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/stop-archive`)
    let configurationPath = `${rootPath}/configuration.json`

    let targetPath1 = `${rootPath}/1/target`
    let targetPath2 = `${rootPath}/2/target`

    describe('(when called without a name)', function () {

      let pid1 = null
      let pid2 = null
      let code = null

      before(async function () {
  
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'start-archive'
        ])

        await Promise.all([
          FileSystem.whenFileExists(1000, 20000, `${targetPath1}/${Configuration.name.content}`),
          FileSystem.whenFileExists(1000, 20000, `${targetPath2}/${Configuration.name.content}`)
        ])

        pid1 = await ProcessManager.getPID('1')
        pid2 = await ProcessManager.getPID('2')

        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'stop-archive'
        ])
  
      })
  
      it('should exit with 0', function () {
        Assert.equal(code, 0)
      })
  
      it('should not be a valid pid', function () {
        Assert.throws(() => Process.kill(pid1, 0))
      })

      it('should not be a valid pid', function () {
        Assert.throws(() => Process.kill(pid2, 0))
      })

      after(async function () {

        let logPath = Configuration.logPath

        let logParentPath = Path.dirname(logPath)
        let logExtension = Path.extname(logPath)

        for (let name of ['1', '2']) {
          await FileSystem.remove(Path.join(logParentPath, `${Path.basename(logPath, logExtension)}-${Sanitize(name)}${logExtension}`))
        }

        await Promise.all([
          FileSystem.remove(`${targetPath1}/${Configuration.name.content}`),
          FileSystem.remove(`${targetPath2}/${Configuration.name.content}`)
        ])

      })
  
    })

    describe('(when started with a name and called without a name)', function () {

      let pid1 = null
      let pid2 = null
      let code = null

      before(async function () {
  
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'start-archive', '2'
        ])

        await FileSystem.whenFileExists(1000, 20000, `${targetPath2}/${Configuration.name.content}`)

        pid2 = await ProcessManager.getPID('2')

        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'stop-archive'
        ])
  
      })
  
      it('should exit with 0', function () {
        Assert.equal(code, 0)
      })
  
      it('should not be a valid pid', function () {
        Assert.throws(() => Process.kill(pid1, 0))
      })

      it('should not be a valid pid', function () {
        Assert.throws(() => Process.kill(pid2, 0))
      })

      after(async function () {

        let logPath = Configuration.logPath

        let logParentPath = Path.dirname(logPath)
        let logExtension = Path.extname(logPath)

        for (let name of ['2']) {
          await FileSystem.remove(Path.join(logParentPath, `${Path.basename(logPath, logExtension)}-${Sanitize(name)}${logExtension}`))
        }

        return FileSystem.remove(`${targetPath2}/${Configuration.name.content}`)
      })
  
    })

    describe('(when called with a name for a started archive)', function () {

      let pid1 = null
      let pid2 = null
      let code = null

      before(async function () {
  
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'start-archive'
        ])

        await Promise.all([
          FileSystem.whenFileExists(1000, 20000, `${targetPath1}/${Configuration.name.content}`),
          FileSystem.whenFileExists(1000, 20000, `${targetPath2}/${Configuration.name.content}`)
        ])

        pid1 = await ProcessManager.getPID('1')
        pid2 = await ProcessManager.getPID('2')

        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'stop-archive', '2'
        ])
  
      })
  
      it('should exit with 0', function () {
        Assert.equal(code, 0)
      })
  
      it('should be a valid pid', function () {
        Process.kill(pid1, 0)
      })

      it('should not be a valid pid', function () {
        Assert.throws(() => Process.kill(pid2, 0))
      })

      after(async function () {

        await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.logLevel, '--logPath', Configuration.logPath,
          'stop-archive', '1'
        ])

        let logPath = Configuration.logPath

        let logParentPath = Path.dirname(logPath)
        let logExtension = Path.extname(logPath)

        for (let name of ['1', '2']) {
          await FileSystem.remove(Path.join(logParentPath, `${Path.basename(logPath, logExtension)}-${Sanitize(name)}${logExtension}`))
        }

        await Promise.all([
          FileSystem.remove(`${targetPath1}/${Configuration.name.content}`),
          FileSystem.remove(`${targetPath2}/${Configuration.name.content}`)
        ])

      })
  
    })

  })

})
