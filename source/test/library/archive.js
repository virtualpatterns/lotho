import { assert as Assert } from 'chai'
import { FileSystem, Path } from '@virtualpatterns/mablung'

import Archive from '../../library/archive'
import Configuration from '../../configuration'

describe('archive', () => {

  before(() => {
    Configuration.merge({
      'parameter': {
        'rsync': {
          '--relative': false
        }
      },
      'range': {
        'progressInSeconds':  {
          'minimum': 0.0
        }
      }
    })
  })

  describe('runOnce()', () => {

    let wait = function(milliseconds) {
      return new Promise((resolve) => {
        setTimeout(resolve, milliseconds)
      })
    }      

    describe('(with an empty source)', () => {

      let rootPath = 'resource/test/library/archive/empty'
      let sourcePath = `${rootPath}/source`
      let targetPath = `${rootPath}/target`
      let excludePath = []
      let schedule = '* * * * * *'

      let result = null

      before(async () => {
        result = await Archive.createArchive(sourcePath, targetPath, excludePath, schedule).runOnce()
      })

      it('should create the content directory', async () => {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath}/content`))
      })

      it('should have created 1 path', () => {
        Assert.equal(result.statistics.countOfCreated, 1)
      })

      it('should have updated 0 paths', () => {
        Assert.equal(result.statistics.countOfUpdated, 0)
      })

      it('should have deleted 0 paths', () => {
        Assert.equal(result.statistics.countOfDeleted, 0)
      })

      after(() => {
        return FileSystem.remove(`${targetPath}/content`)
      })

    })

    describe('(with a file in source)', () => {

      let rootPath = 'resource/test/library/archive/single'
      let sourcePath = `${rootPath}/source`
      let targetPath = `${rootPath}/target`
      let excludePath = []
      let schedule = '* * * * * *'

      let result = null

      before(async () => {
        result = await Archive.createArchive(sourcePath, targetPath, excludePath, schedule).runOnce()
      })

      it('should create the file', async () => {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath}/content/a.txt`))
      })

      it('should have created 2 paths', () => {
        Assert.equal(result.statistics.countOfCreated, 2)
      })

      it('should have updated 1 path', () => {
        Assert.equal(result.statistics.countOfUpdated, 1)
      })

      it('should have deleted 0 paths', () => {
        Assert.equal(result.statistics.countOfDeleted, 0)
      })

      after(() => {
        return FileSystem.remove(`${targetPath}/content`)
      })

    })

    describe.skip('(with a hidden directory in source and a remote target)', () => {

      let rootPath = 'resource/test/library/archive/hidden'
      let sourcePath = `${rootPath}/source`
      let targetPath = `BUCKBEAK.local:/Volumes/BUCKBEAK1/Backup/PODMORE/${rootPath}/target`
      let excludePath = []
      let schedule = '* * * * * *'

      let result = null

      before(async () => {

        let archive = Archive.createArchive(sourcePath, targetPath, excludePath, schedule)
        result = await archive.runOnce()

        await wait(1000)

        result = await archive.runOnce()

      })

      it('should have created 0 paths', () => {
        Assert.equal(result.statistics.countOfCreated, 0)
      })

      it('should have updated 0 paths', () => {
        Assert.equal(result.statistics.countOfUpdated, 0)
      })

    })

    describe('(with an updated file in source)', () => {

      let rootPath = 'resource/test/library/archive/updated'
      let sourcePath = `${rootPath}/source`
      let targetPath = `${rootPath}/target`
      let excludePath = []
      let schedule = '* * * * * *'

      let result = null

      before(async () => {

        let archive = Archive.createArchive(sourcePath, targetPath, excludePath, schedule)

        await FileSystem.writeJson(`${sourcePath}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 })
        result = await archive.runOnce()

        await wait(1000)

        await FileSystem.writeJson(`${sourcePath}/a.json`, { 'value': 'def' }, { 'encoding': 'utf-8', 'spaces': 2 })
        result = await archive.runOnce()

      })

      it('should create a record of the original file', async () => {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath}/${result.stamp}/a.json`))
      })

      it('should have created 0 paths', () => {
        Assert.equal(result.statistics.countOfCreated, 0)
      })

      it('should have updated 1 path', () => {
        Assert.equal(result.statistics.countOfUpdated, 1)
      })

      it('should have deleted 0 paths', () => {
        Assert.equal(result.statistics.countOfDeleted, 0)
      })

      after(() => {
        return Promise.all([
          FileSystem.remove(`${sourcePath}/def`),
          FileSystem.remove(`${sourcePath}/a.json`),
          FileSystem.remove(`${targetPath}/content`),
          FileSystem.remove(`${targetPath}/${result.stamp}`)
        ])
      })

    })

    describe('(with a deleted file in source)', () => {

      let rootPath = 'resource/test/library/archive/deleted'
      let sourcePath = `${rootPath}/source`
      let targetPath = `${rootPath}/target`
      let excludePath = []
      let schedule = '* * * * * *'

      let result = null

      before(async () => {

        let archive = Archive.createArchive(sourcePath, targetPath, excludePath, schedule)

        await FileSystem.writeJson(`${sourcePath}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 })
        result = await archive.runOnce()

        await FileSystem.remove(`${sourcePath}/a.json`),
        result = await archive.runOnce()

      })

      it('should create a record of the original file', async () => {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath}/${result.stamp}/a.json`))
      })

      it('should have created 0 paths', () => {
        Assert.equal(result.statistics.countOfCreated, 0)
      })

      it('should have updated 0 paths', () => {
        Assert.equal(result.statistics.countOfUpdated, 0)
      })

      it('should have deleted 1 path', () => {
        Assert.equal(result.statistics.countOfDeleted, 1)
      })

      after(() => {
        return Promise.all([
          FileSystem.remove(`${targetPath}/content`),
          FileSystem.remove(`${targetPath}/${result.stamp}`)
        ])
      })

    })

    describe('(with an excluded file in source)', () => {

      let rootPath = 'resource/test/library/archive/excluded'
      let sourcePath = `${rootPath}/source`
      let targetPath = `${rootPath}/target`
      let excludePath = 'b.txt'
      let schedule = '* * * * * *'

      let result = null

      before(async () => {
        result = await Archive.createArchive(sourcePath, targetPath, excludePath, schedule).runOnce()
      })

      it('should create the not excluded file', async () => {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath}/content/a.txt`))
      })

      it('should not create the excluded file', async () => {
        Assert.isFalse(await FileSystem.pathExists(`${targetPath}/content/b.txt`))
      })

      it('should have created 2 paths', () => {
        Assert.equal(result.statistics.countOfCreated, 2)
      })

      it('should have updated 1 paths', () => {
        Assert.equal(result.statistics.countOfUpdated, 1)
      })

      it('should have deleted 0 path', () => {
        Assert.equal(result.statistics.countOfDeleted, 0)
      })

      after(() => {
        return FileSystem.remove(`${targetPath}/content`)
      })

    })

    describe('(with an excluded file in target)', () => {

      let rootPath = 'resource/test/library/archive/excluded'
      let sourcePath = `${rootPath}/source`
      let targetPath = `${rootPath}/target`
      let excludePath = 'b.txt'
      let schedule = '* * * * * *'

      let result = null

      before(async () => {
        result = await Archive.createArchive(sourcePath, targetPath, [], schedule).runOnce()
        result = await Archive.createArchive(sourcePath, targetPath, excludePath, schedule).runOnce()
      })

      it('should delete the excluded file', async () => {
        Assert.isFalse(await FileSystem.pathExists(`${targetPath}/content/b.txt`))
      })

      it('should create a record of the excluded/deleted file', async () => {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath}/${result.stamp}/b.txt`))
      })

      it('should have created 0 paths', () => {
        Assert.equal(result.statistics.countOfCreated, 0)
      })

      it('should have updated 0 paths', () => {
        Assert.equal(result.statistics.countOfUpdated, 0)
      })

      it('should have deleted 1 path', () => {
        Assert.equal(result.statistics.countOfDeleted, 1)
      })

      after(() => {
        return Promise.all([
          FileSystem.remove(`${targetPath}/content`),
          FileSystem.remove(`${targetPath}/${result.stamp}`)
        ])
      })

    })

    describe.skip('(with a file in multiple sources)', () => {

      let rootPath = 'resource/test/library/archive/multiple'
      let sourcePath = [ `${rootPath}/source/a`, `${rootPath}/source/b` ]
      let targetPath = `${rootPath}/target`
      let excludePath = []
      let schedule = '* * * * * *'

      before(() => {
        return Archive.createArchive(sourcePath, targetPath, excludePath, schedule).runOnce()
      })

      it('should create the file', async () => {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath}/content/a.txt`))
      })

      after(() => {
        return FileSystem.remove(`${targetPath}/content`)
      })

    })

  })

  describe('startSchedule()', () => {

    describe('(with an empty source)', () => {

      let rootPath = 'resource/test/library/archive/empty'
      let sourcePath = `${rootPath}/source`
      let targetPath = `${rootPath}/target`
      let excludePath = []
      let schedule = '*/5 * * * * *'

      let archive = null
      let result = null

      before((complete) => {

        archive = Archive.createArchive(sourcePath, targetPath, excludePath, schedule)

        archive.startSchedule()
        archive.once('completed', (_result) => {
          result = _result
          complete()
        })

      })

      it('should create the content directory', async () => {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath}/content`))
      })

      it('should have created 1 path', () => {
        Assert.equal(result.statistics.countOfCreated, 1)
      })

      it('should have updated 0 paths', () => {
        Assert.equal(result.statistics.countOfUpdated, 0)
      })

      it('should have deleted 0 paths', () => {
        Assert.equal(result.statistics.countOfDeleted, 0)
      })

      after(() => {
        return Promise.resolve()
          .then(() => archive.stopSchedule())
          .then(() => FileSystem.remove(`${targetPath}/content`))
      })

    })

    describe('(with an updated file in source)', () => {

      let rootPath = 'resource/test/library/archive/updated'
      let sourcePath = `${rootPath}/source`
      let targetPath = `${rootPath}/target`
      let excludePath = []
      let schedule = '*/5 * * * * *'

      let archive = null
      let result = null

      before(() => {

        return Promise.resolve()
          .then(() => FileSystem.writeJson(`${sourcePath}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 }))
          .then(() => new Promise((resolve) => {

            archive = Archive.createArchive(sourcePath, targetPath, excludePath, schedule)

            archive.startSchedule()
            archive.once('completed', () => resolve())

          }))
          .then(() => FileSystem.writeJson(`${sourcePath}/a.json`, { 'value': 'def' }, { 'encoding': 'utf-8', 'spaces': 2 }))
          .then(() => new Promise((resolve) => {

            archive.once('completed', (_result) => {
              result = _result
              resolve()
            })

          }))

      })

      it('should create a record of the original file', async () => {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath}/${result.stamp}/a.json`))
      })

      it('should have created 0 paths', () => {
        Assert.equal(result.statistics.countOfCreated, 0)
      })

      it('should have updated 1 path', () => {
        Assert.equal(result.statistics.countOfUpdated, 1)
      })

      it('should have deleted 0 paths', () => {
        Assert.equal(result.statistics.countOfDeleted, 0)
      })

      after(() => {
        return Promise.resolve()
          .then(() => archive.stopSchedule())
          .then(() => Promise.all([
            FileSystem.remove(`${sourcePath}/a.json`),
            FileSystem.remove(`${targetPath}/content`),
            FileSystem.remove(`${targetPath}/${result.stamp}`)
          ]))
      })

    })

    describe.skip('(with a very large source to a remote target)', () => {

      let sourcePath = Path.normalize(`${__dirname}/../../../../lotho`)
      let targetPath = `BUCKBEAK.local:/Volumes/BUCKBEAK1/Backup/${Configuration.computerName}`
      let excludePath = [ 'distributable' ]
      let schedule = '*/5 * * * * *'

      let archive = null

      before(() => {
        (archive = Archive.createArchive(sourcePath, targetPath, excludePath, schedule)).startSchedule()
      })

      it('should ...', (complete) => {
        archive.once('completed', () => {
          Assert.isTrue(true)
          complete()
        })
      })

      it('should ...', (complete) => {
        archive.once('completed', () => {
          Assert.isTrue(true)
          complete()
        })
      })

      after(() => {
        archive.stopSchedule()
      })

    })

  })

  after(() => {
    Configuration.clear()
  })

})
