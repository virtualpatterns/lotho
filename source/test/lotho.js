import '@babel/polyfill'
import { assert as Assert } from 'chai'
import ChildProcess from 'child_process'
import { FileSystem, Log, Path, Process } from '@virtualpatterns/mablung'
import Source from 'source-map-support'

import Configuration from '../configuration'
import Package from '../../package.json'
import ProcessManager from '../library/process-manager'

import { FileExistsError } from './error/test-error'

Source.install({ 'handleUncaughtExceptions': false })

before(async function () {

  Configuration.merge(Configuration.test)

  if (Configuration.logPath == 'console') {
    Log.createFormattedLog({ 'level': Configuration.logLevel })
  }
  else {
    await FileSystem.ensureDir(Path.dirname(Configuration.logPath))
    await FileSystem.remove(Configuration.logPath)
    Log.createFormattedLog({ 'level': Configuration.logLevel }, Configuration.logPath)
  }

})

describe('lotho', function () {
  
  const lothoPrototype = Object.create({})

  lothoPrototype.stop = function () {
    return new Promise((resolve) => {
      this.process.once('exit', resolve)
      this.process.kill()
    })
  }
  
  const Lotho = Object.create({})
  
  Lotho.startLotho = function (parameter = [], option = {}, prototype = lothoPrototype) {
    Log.trace(parameter, 'Lotho.startLotho(parameter, prototype)')
  
    let lotho = Object.create(prototype)

    let _parameter = Configuration.getParameter(Configuration.test.parameter.lotho, parameter)
    let _option = Configuration.getOption(Configuration.test.option.lotho, option)
  
    lotho.process = ChildProcess.fork(Configuration.test.path.lotho, _parameter, _option)
    
    return lotho
  
  }
  
  Lotho.getLothoPrototype = function () {
    return lothoPrototype
  }
  
  Lotho.isLotho = function (lotho) {
    return lothoPrototype.isPrototypeOf(lotho)
  }
  
  Lotho.run = function (parameter = [], option = {}) {
    Log.trace({ parameter }, 'Lotho.startLotho(parameter, prototype)')

    return new Promise((resolve) => {

      let _parameter = Configuration.getParameter(Configuration.test.parameter.lotho, parameter)
      let _option = Configuration.getOption(Configuration.test.option.lotho, option)
        
      ChildProcess
        .fork(Configuration.test.path.lotho, _parameter, _option)
        .once('exit', resolve)
  
    })
  
  }
  
  let processManager = null

  before(async function () {
    processManager = await ProcessManager.openProcessManager({})
  })

  describe('--help', function () {

    let code = null

    before(async function () {
      code = await Lotho.run({ '--help': true })
    })

    it('should exit with 0', function () {
      Assert.equal(code, 0)
    })

  })

  describe('create-configuration', function () {
 
    let configurationPath = null
    let code = null

    before(async function () {

      configurationPath = 'resource/test/lotho/create-configuration/configuration.json'

      code = await Lotho.run({
        '--configuration-path': configurationPath,
        '--log-level': Configuration.logLevel, 
        '--log-path': Configuration.logPath,
        'create-configuration': true
      })

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

    let configurationPath = null

    let targetPath1 = null
    let targetPath2 = null

    before(async function () {

      let rootPath = 'resource/test/lotho/run-archive'

      configurationPath = `${rootPath}/configuration.json`
  
      targetPath1 = `${rootPath}/1/target`
      targetPath2 = `${rootPath}/2/target`
  
    })

    describe('(when called without a name)', function () {

      let code = null

      before(async function () {
        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'run-archive': true
        })
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
        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'run-archive': '1.5'
        })
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
        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'run-archive': '2'
        })
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

    let targetPath = null
    let lotho = null

    before(async function () {

      let rootPath = 'resource/test/lotho/run-schedule'
      let configurationPath = `${rootPath}/configuration.json`

      targetPath = `${rootPath}/target`
    
      lotho = Lotho.startLotho({
        '--configuration-path': configurationPath,
        '--log-level': Configuration.logLevel, 
        '--log-path': Configuration.logPath,
        'run-schedule': Package.name
      })

    })

    it('should create the content directory', function () {
      return FileSystem.whenFileExists(1000, 20000, `${targetPath}/${Configuration.name.content}`)
    })
    
    after(async function () {
      await lotho.stop(process)
      await FileSystem.remove(`${targetPath}/${Configuration.name.content}`)
    })

  })
   
  describe('start-archive [name]', function () {

    let configurationPath = null

    let targetPath1 = null
    let targetPath2 = null

    before(function () {

      let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/start-archive`)

      configurationPath = `${rootPath}/configuration.json`

      targetPath1 = `${rootPath}/1/target`
      targetPath2 = `${rootPath}/2/target`
  
    })

    describe('(when called without a name)', function () {

      let code = null
      let pid1 = null
      let pid2 = null

      before(async function () {
        
        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'start-archive': true
        })

        pid1 = await processManager.getArchivePID('1')
        pid2 = await processManager.getArchivePID('2')

      })
  
      it('should exit with 0', function () {
        Assert.equal(code, 0)
      })
  
      it('should be a valid pid', function () {
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

        await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'stop-archive': true
        })

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

        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'start-archive': '2'
        })

        pid1 = await processManager.getArchivePID('1')
        pid2 = await processManager.getArchivePID('2')

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

        await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'stop-archive': '2'
        })

        await FileSystem.remove(`${targetPath2}/${Configuration.name.content}`)

      })
  
    })

  })

  describe('stop-archive [name]', function () {

    let configurationPath = null

    let targetPath1 = null
    let targetPath2 = null

    before(function () {

      let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/stop-archive`)

      configurationPath = `${rootPath}/configuration.json`

      targetPath1 = `${rootPath}/1/target`
      targetPath2 = `${rootPath}/2/target`
  
    })

    describe('(when called without a name)', function () {

      let pid1 = null
      let pid2 = null
      let code = null

      before(async function () {
  
        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'start-archive': true
        })

        await Promise.all([
          FileSystem.whenFileExists(1000, 20000, `${targetPath1}/${Configuration.name.content}`),
          FileSystem.whenFileExists(1000, 20000, `${targetPath2}/${Configuration.name.content}`)
        ])

        pid1 = await processManager.getArchivePID('1')
        pid2 = await processManager.getArchivePID('2')

        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'stop-archive': true
        })
  
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

      after(function () {
        return Promise.all([
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
  
        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'start-archive': '2'
        })
        
        await FileSystem.whenFileExists(1000, 20000, `${targetPath2}/${Configuration.name.content}`)
        
        pid2 = await processManager.getArchivePID('2')
        
        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'stop-archive': true
        })

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

      after(function () {
        return FileSystem.remove(`${targetPath2}/${Configuration.name.content}`)
      })
  
    })

    describe('(when called with a name for a started archive)', function () {

      let pid1 = null
      let pid2 = null
      let code = null

      before(async function () {
  
        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'start-archive': true
        })

        await Promise.all([
          FileSystem.whenFileExists(1000, 20000, `${targetPath1}/${Configuration.name.content}`),
          FileSystem.whenFileExists(1000, 20000, `${targetPath2}/${Configuration.name.content}`)
        ])

        pid1 = await processManager.getArchivePID('1')
        pid2 = await processManager.getArchivePID('2')

        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'stop-archive': '2'
        })
  
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

        await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'stop-archive': '1'
        })

        await Promise.all([
          FileSystem.remove(`${targetPath1}/${Configuration.name.content}`),
          FileSystem.remove(`${targetPath2}/${Configuration.name.content}`)
        ])

      })
  
    })

  })
   
  describe('restart-archive [name]', function () {

    let configurationPath = null

    let targetPath1 = null
    let targetPath2 = null

    before(function () {

      let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/restart-archive`)

      configurationPath = `${rootPath}/configuration.json`

      targetPath1 = `${rootPath}/1/target`
      targetPath2 = `${rootPath}/2/target`
  
    })

    describe('(when called without a name)', function () {

      let code = null
      let pid1 = null
      let pid2 = null
      let pid3 = null
      let pid4 = null

      before(async function () {
        
        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'start-archive': true
        })

        pid1 = await processManager.getArchivePID('1')
        pid2 = await processManager.getArchivePID('2')
        
        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'restart-archive': true
        })

        pid3 = await processManager.getArchivePID('1')
        pid4 = await processManager.getArchivePID('2')

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

      it('should be a valid pid', function () {
        Process.kill(pid3, 0)
      })

      it('should be a valid pid', function () {
        Process.kill(pid4, 0)
      })
      
      it('should not be the same pid', function () {
        Assert.notEqual(pid3, pid1)
      })

      it('should not be the same pid', function () {
        Assert.notEqual(pid4, pid2)
      })

      after(async function () {

        await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'stop-archive': true
        })

        await Promise.all([
          FileSystem.remove(`${targetPath1}/${Configuration.name.content}`),
          FileSystem.remove(`${targetPath2}/${Configuration.name.content}`)
        ])

      })
  
    })

    describe('(when called with a name)', function () {

      let pid1 = null
      let pid2 = null
      let pid3 = null
      let pid4 = null
      let code = null

      before(async function () {

        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'start-archive': true
        })

        pid1 = await processManager.getArchivePID('1')
        pid2 = await processManager.getArchivePID('2')
        
        code = await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'restart-archive': '2'
        })

        pid3 = await processManager.getArchivePID('1')
        pid4 = await processManager.getArchivePID('2')

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

      it('should be a valid pid', function () {
        Process.kill(pid3, 0)
      })

      it('should be a valid pid', function () {
        Process.kill(pid4, 0)
      })
      
      it('should be the same pid', function () {
        Assert.equal(pid3, pid1)
      })

      it('should not be the same pid', function () {
        Assert.notEqual(pid4, pid2)
      })

      after(async function () {

        await Lotho.run({
          '--configuration-path': configurationPath,
          '--log-level': Configuration.logLevel, 
          '--log-path': Configuration.logPath,
          'stop-archive': true
        })

        await Promise.all([
          FileSystem.remove(`${targetPath1}/${Configuration.name.content}`),
          FileSystem.remove(`${targetPath2}/${Configuration.name.content}`)
        ])

      })
  
    })

  })

  after(function () {
    return processManager.close()
  })

})

require('./library/archive/local')
require('./library/archive/published')
require('./library/archive/remote')
require('./library/archive')
require('./library/utility/is')
require('./library/process-manager')
require('./configuration')
