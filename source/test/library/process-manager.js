import { assert as Assert } from 'chai'
import { FileSystem, Path, Process } from '@virtualpatterns/mablung'

import Package from '../../../package.json'
import ProcessManager from '../../library/process-manager'
import Configuration from '../../configuration'

describe('process-manager', () => {

  describe('startArchive(name)', () => {

    let rootPath = Path.normalize(`${__dirname}/../../../resource/test/library/process-manager/startArchive`)
    let configurationPath = `${rootPath}/configuration.json`
    let name = Package.name
    let targetPath = `${rootPath}/target`

    let pid = null 

    before(async () => {
      Configuration.merge(configurationPath)
      pid = (await ProcessManager.startArchive(name)).pid
    })
  
    it('should be a valid pid', () => {
      Process.kill(pid, 0)
    })

    it('should create the content directory', () => {
      return FileSystem.whenFileExists(1000, 20000, `${targetPath}/content`)
    })

    after(async () => {
      await ProcessManager.stopArchive(name)
      await FileSystem.remove(`${targetPath}/content`)
      Configuration.clear()
    })

  })

  describe('stopArchive(name)', () => {

    let rootPath = Path.normalize(`${__dirname}/../../../resource/test/library/process-manager/stopArchive`)
    let configurationPath = `${rootPath}/configuration.json`
    let name = Package.name
    let targetPath = `${rootPath}/target`

    let pid = null 

    before(async () => {
      Configuration.merge(configurationPath)
      pid = (await ProcessManager.startArchive(name)).pid
      await ProcessManager.stopArchive(name)
    })
  
    it('should not be a valid pid', () => {
      Assert.throws(() => Process.kill(pid, 0))
    })

    after(async () => {
      await FileSystem.remove(`${targetPath}/content`)
      Configuration.clear()
    })

  })

})
