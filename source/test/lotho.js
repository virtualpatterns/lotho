import { assert as Assert } from 'chai'
import ChildProcess from 'child_process'
import { FileSystem, Path, Process } from '@virtualpatterns/mablung'

import Configuration from '../configuration'
import ProcessManager from '../library/process-manager'

describe.only('lotho', () => {

  let runLotho = function (parameter) {
    return new Promise((resolve) => {
      ChildProcess
        .fork(Configuration.test.path.lotho, [ ...Configuration.getParameter(Configuration.test.parameter.lotho), ...parameter ], { 'silent': true })
        .on('exit', (code) => {
          resolve(code)
        })
    })
  }

  let startLotho = function (parameter) {
    return ChildProcess
      .fork(Configuration.test.path.lotho, [ ...Configuration.getParameter(Configuration.test.parameter.lotho), ...parameter ], { 'silent': true })
  }

  let stopLotho = function (process) {
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
      code = await runLotho([ '--help' ])
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
      code = await runLotho([
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

  describe('run-once', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/run-once`)
    let configurationPath = `${rootPath}/configuration.json`
    let targetPath = `${rootPath}/target`

    let code = null

    before(async () => {
      code = await runLotho([
        '--configurationPath', configurationPath,
        '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
        'run-once'
      ])
    })

    it('should exit with 0', () => {
      Assert.equal(code, 0)
    })

    it('should create the content directory', async () => {
      Assert.isTrue(await FileSystem.pathExists(`${targetPath}/content`))
    })
    
    after(() => {
      return FileSystem.remove(`${targetPath}/content`)
    })

  })
   
  describe('run-schedule', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/run-schedule`)
    let configurationPath = `${rootPath}/configuration.json`
    let targetPath = `${rootPath}/target`

    let process = null

    before(() => {
      process = startLotho([
        '--configurationPath', configurationPath,
        '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
        'run-schedule'
      ])
    })

    it('should create the content directory', () => {
      return FileSystem.whenFileExists(1000, 20000, `${targetPath}/content`)
    })
    
    after(async () => {
      await stopLotho(process)
      await FileSystem.remove(`${targetPath}/content`)
    })

  })
   
  describe('start-archive', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/start-archive`)
    let configurationPath = `${rootPath}/configuration.json`
    let targetPath = `${rootPath}/target`

    let code = null

    before(async () => {
      code = await runLotho([
        '--configurationPath', configurationPath,
        '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
        'start-archive'
      ])
    })

    it('should exit with 0', () => {
      Assert.equal(code, 0)
    })

    it('should create the process manager pid file', async () => {
      Assert.isTrue(await FileSystem.pathExists(`${Process.env.HOME}/.pm2/pm2.pid`))
    })
    
    it('should create the content directory', () => {
      return FileSystem.whenFileExists(1000, 20000, `${targetPath}/content`)
    })
    
    after(async () => {
      await runLotho([
        '--configurationPath', configurationPath,
        '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
        'stop-archive'
      ])
      await FileSystem.remove(`${targetPath}/content`)
    })

  })
   
  describe('stop-archive', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/stop-archive`)
    let configurationPath = `${rootPath}/configuration.json`
    let targetPath = `${rootPath}/target`

    let code = null

    before(async () => {

      await runLotho([
        '--configurationPath', configurationPath,
        '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
        'start-archive'
      ])
      await FileSystem.whenFileExists(1000, 20000, `${targetPath}/content`)
      code = await runLotho([
        '--configurationPath', configurationPath,
        '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
        'stop-archive'
      ])

    })

    it('should exit with 0', () => {
      Assert.equal(code, 0)
    })

    after(() => {
      return FileSystem.remove(`${targetPath}/content`)
    })

  })

})
