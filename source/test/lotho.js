import { assert as Assert } from 'chai'
import ChildProcess from 'child_process'
import { FileSystem, Path, Process } from '@virtualpatterns/mablung'

import Configuration from '../configuration'
import Package from '../../package.json'
import ProcessManager from '../library/process-manager'

import { FileExistsError } from './error/test-error'

describe('lotho', () => {

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

  describe('--help', () => {

    let code = null

    before(async () => {
      code = await run([ '--help' ])
    })

    it('should exit with 0', () => {
      Assert.equal(code, 0)
    })

  })

  describe('create-configuration', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/create-configuration`)
    let configurationPath = `${rootPath}/configuration.json`

    let code = null

    before(async () => {
      code = await run([
        '--configurationPath', configurationPath,
        '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
        'create-configuration'
      ])
    })

    it('should exit with 0', () => {
      Assert.equal(code, 0)
    })

    it('should create the configuration file', async () => {
      Assert.isTrue(await FileSystem.pathExists(configurationPath))
    })
    
    after(() => {
      return FileSystem.remove(configurationPath)
    })

  })

  describe('run-once [name]', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/run-once`)
    let configurationPath = `${rootPath}/configuration.json`

    let targetPath1 = `${rootPath}/1/target`
    let targetPath2 = `${rootPath}/2/target`

    describe('(when called without a name)', () => {

      let code = null

      before(async () => {
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'run-once'
        ])
      })
  
      it('should exit with 0', () => {
        Assert.equal(code, 0)
      })
  
      it('should create the content directory', async () => {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath1}/content`))
      })
  
      it('should create the content directory', async () => {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath2}/content`))
      })
      
      after(() => {
        return Promise.all([
          FileSystem.remove(`${targetPath1}/content`),
          FileSystem.remove(`${targetPath2}/content`)
        ])
      })
  
    })

    describe('(when called with a name that fails)', () => {

      let code = null

      before(async () => {
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'run-once', '1.5'
        ])
      })
  
      it('should exit with 2', () => {
        Assert.equal(code, 2)
      })
  
      it('should not create the content directory', async () => {
        Assert.isFalse(await FileSystem.pathExists(`${targetPath1}/content`))
      })
  
      it('should not create the content directory', async () => {
        Assert.isFalse(await FileSystem.pathExists(`${targetPath2}/content`))
      })
      
    })

    describe('(when called with a name that succeeds)', () => {

      let code = null

      before(async () => {
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'run-once', '2'
        ])
      })
  
      it('should exit with 0', () => {
        Assert.equal(code, 0)
      })
  
      it('should not create the content directory', async () => {
        Assert.isFalse(await FileSystem.pathExists(`${targetPath1}/content`))
      })
  
      it('should create the content directory', async () => {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath2}/content`))
      })
      
      after(() => {
        return FileSystem.remove(`${targetPath2}/content`)
      })
  
    })

  })
   
  describe('run-schedule <name>', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/run-schedule`)
    let configurationPath = `${rootPath}/configuration.json`
    let targetPath = `${rootPath}/target`

    let process = null

    before(() => {
      process = start([
        '--configurationPath', configurationPath,
        '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
        'run-schedule', Package.name
      ])
    })

    it('should create the content directory', () => {
      return FileSystem.whenFileExists(1000, 20000, `${targetPath}/content`)
    })
    
    after(async () => {
      await stop(process)
      await FileSystem.remove(`${targetPath}/content`)
    })

  })
   
  describe('start-archive [name]', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/start-archive`)
    let configurationPath = `${rootPath}/configuration.json`

    let targetPath1 = `${rootPath}/1/target`
    let targetPath2 = `${rootPath}/2/target`

    describe('(when called without a name)', () => {

      let pid1 = null
      let pid2 = null
      let code = null

      before(async () => {
        
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'start-archive'
        ])

        pid1 = await ProcessManager.getPID('1')
        pid2 = await ProcessManager.getPID('2')

      })
  
      it('should exit with 0', () => {
        Assert.equal(code, 0)
      })
  
      it('should be a valid pid', () => {
        Process.kill(pid1, 0)
      })

      it('should create the content directory', () => {
        return FileSystem.whenFileExists(1000, 20000, `${targetPath1}/content`)
      })
 
      it('should be a valid pid', () => {
        Process.kill(pid2, 0)
      })
 
      it('should create the content directory', () => {
        return FileSystem.whenFileExists(1000, 20000, `${targetPath2}/content`)
      })
      
      after(async () => {
        await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'stop-archive'
        ])
        await Promise.all([
          FileSystem.remove(`${targetPath1}/content`),
          FileSystem.remove(`${targetPath2}/content`)
        ])
      })
  
    })

    describe('(when called with a name)', () => {

      let pid1 = null
      let pid2 = null
      let code = null

      before(async () => {

        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'start-archive', '2'
        ])

        pid1 = await ProcessManager.getPID('1')
        pid2 = await ProcessManager.getPID('2')

      })
  
      it('should exit with 0', () => {
        Assert.equal(code, 0)
      })
  
      it('should not be a valid pid', () => {
        Assert.throws(() => Process.kill(pid1, 0))
      })

      it('should not create the content directory', (complete) => {
        setTimeout(() => {
          complete(FileSystem.pathExistsSync(`${targetPath1}/content`) ? new FileExistsError(`${targetPath1}/content`) : undefined)
        }, 9000)
      })
 
      it('should be a valid pid', () => {
        Process.kill(pid2, 0)
      })
 
      it('should create the content directory', () => {
        return FileSystem.whenFileExists(1000, 20000, `${targetPath2}/content`)
      })
      
      after(async () => {
        await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'stop-archive', '2'
        ])
        await FileSystem.remove(`${targetPath2}/content`)
      })
  
    })

  })
   
  describe('stop-archive [name]', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/stop-archive`)
    let configurationPath = `${rootPath}/configuration.json`

    let targetPath1 = `${rootPath}/1/target`
    let targetPath2 = `${rootPath}/2/target`

    describe('(when called without a name)', () => {

      let pid1 = null
      let pid2 = null
      let code = null

      before(async () => {
  
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'start-archive'
        ])

        await Promise.all([
          FileSystem.whenFileExists(1000, 20000, `${targetPath1}/content`),
          FileSystem.whenFileExists(1000, 20000, `${targetPath2}/content`)
        ])

        pid1 = await ProcessManager.getPID('1')
        pid2 = await ProcessManager.getPID('2')

        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'stop-archive'
        ])
  
      })
  
      it('should exit with 0', () => {
        Assert.equal(code, 0)
      })
  
      it('should not be a valid pid', () => {
        Assert.throws(() => Process.kill(pid1, 0))
      })

      it('should not be a valid pid', () => {
        Assert.throws(() => Process.kill(pid2, 0))
      })

      after(() => {
        return Promise.all([
          FileSystem.remove(`${targetPath1}/content`),
          FileSystem.remove(`${targetPath2}/content`)
        ])
      })
  
    })

    describe('(when started with a name and called without a name)', () => {

      let pid1 = null
      let pid2 = null
      let code = null

      before(async () => {
  
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'start-archive', '2'
        ])

        await FileSystem.whenFileExists(1000, 20000, `${targetPath2}/content`)

        pid2 = await ProcessManager.getPID('2')

        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'stop-archive'
        ])
  
      })
  
      it('should exit with 0', () => {
        Assert.equal(code, 0)
      })
  
      it('should not be a valid pid', () => {
        Assert.throws(() => Process.kill(pid1, 0))
      })

      it('should not be a valid pid', () => {
        Assert.throws(() => Process.kill(pid2, 0))
      })

      after(() => {
        return FileSystem.remove(`${targetPath2}/content`)
      })
  
    })

    describe('(when called with a name for a started archive)', () => {

      let pid1 = null
      let pid2 = null
      let code = null

      before(async () => {
  
        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'start-archive'
        ])

        await Promise.all([
          FileSystem.whenFileExists(1000, 20000, `${targetPath1}/content`),
          FileSystem.whenFileExists(1000, 20000, `${targetPath2}/content`)
        ])

        pid1 = await ProcessManager.getPID('1')
        pid2 = await ProcessManager.getPID('2')

        code = await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'stop-archive', '2'
        ])
  
      })
  
      it('should exit with 0', () => {
        Assert.equal(code, 0)
      })
  
      it('should be a valid pid', () => {
        Process.kill(pid1, 0)
      })

      it('should not be a valid pid', () => {
        Assert.throws(() => Process.kill(pid2, 0))
      })

      after(async () => {
        await run([
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'stop-archive', '1'
        ])
        await Promise.all([
          FileSystem.remove(`${targetPath1}/content`),
          FileSystem.remove(`${targetPath2}/content`)
        ])
      })
  
    })

  })

})
