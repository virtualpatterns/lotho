import { assert as Assert } from 'chai'
import { Duration, Interval } from 'luxon'
import { FileSystem } from '@virtualpatterns/mablung'

import Configuration from '../../../configuration'
import Local from '../../../library/archive/local'

describe('local', function () {

  before(function () {
    Configuration.merge({
      'parameter': {
        'rsync': {
          '--prune-empty-dirs': false,
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

  describe.skip('archive(stamp)', function () {

    let stamp = null

    before(function () {
      stamp = Configuration.now()  
    })
  
    describe('(with an empty source)', function () {

      let rootPath = null
      let option = null

      before(async function () {

        rootPath = 'resource/test/library/archive/empty'
        option = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${rootPath}/target`
          }
        }

        for (let index = 5; index >= 1; index-- ) {

          let previous = stamp.minus(Duration.fromObject({ 'minutes': index * 30 }))
          let previousAsString = previous.toFormat(Configuration.format.stamp)

          await FileSystem.mkdir(`${option.path.target}/${previousAsString}`, { 'recursive': true })

        }
  
        await Local.createArchive(option).archive(stamp)

      })

      it('should ...', function () {})

      after(function () {
        return FileSystem.remove(`${option.path.target}/${Configuration.name.content}`)
      })

    })

  })

  describe('synchronize(stamp)', function () {

    let wait = function(milliseconds) {
      return new Promise((resolve) => {
        setTimeout(resolve, milliseconds)
      })
    }      

    let stamp = null

    before(function () {
      stamp = Configuration.now()  
    })
  
    describe('(with an empty source)', function () {

      let rootPath = null
      let option = null

      let result = null

      before(async function () {

        rootPath = 'resource/test/library/archive/empty'
        option = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${rootPath}/target`
          }
        }
  
        result = await Local.createArchive(option).synchronize(stamp)

      })

      it('should create the content directory', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${option.path.target}/${Configuration.name.content}`))
      })

      it('should have created 1 path', function () {
        Assert.equal(result.countOfCreated, 1)
      })

      it('should have updated 0 paths', function () {
        Assert.equal(result.countOfUpdated, 0)
      })

      it('should have deleted 0 paths', function () {
        Assert.equal(result.countOfDeleted, 0)
      })

      after(function () {
        return FileSystem.remove(`${option.path.target}/${Configuration.name.content}`)
      })

    })

    describe('(with a file in source)', function () {

      let rootPath = null
      let option = null

      let result = null

      before(async function () {

        rootPath = 'resource/test/library/archive/single'
        option = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${rootPath}/target`
          }
        }
  
        result = await Local.createArchive(option).synchronize(stamp)

      })

      it('should create the file', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${option.path.target}/${Configuration.name.content}/a.txt`))
      })

      it('should have created 2 paths', function () {
        Assert.equal(result.countOfCreated, 2)
      })

      it('should have updated 1 path', function () {
        Assert.equal(result.countOfUpdated, 1)
      })

      it('should have deleted 0 paths', function () {
        Assert.equal(result.countOfDeleted, 0)
      })

      after(function () {
        return FileSystem.remove(`${option.path.target}/${Configuration.name.content}`)
      })

    })

    describe('(with an updated file in source)', function () {

      let rootPath = null
      let option = null

      let result = null

      before(async function () {

        rootPath = 'resource/test/library/archive/updated'
        option = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${rootPath}/target`
          }
        }
  
        let _archive = Local.createArchive(option)

        await FileSystem.writeJson(`${option.path.source}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 })
        result = await _archive.synchronize(stamp)

        await wait(1000)

        await FileSystem.writeJson(`${option.path.source}/a.json`, { 'value': 'def' }, { 'encoding': 'utf-8', 'spaces': 2 })
        result = await _archive.synchronize(stamp)

      })

      it('should create a record of the original file', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${option.path.target}/${stamp.toFormat(Configuration.format.stamp)}/a.json`))
      })

      it('should have created 0 paths', function () {
        Assert.equal(result.countOfCreated, 0)
      })

      it('should have updated 1 path', function () {
        Assert.equal(result.countOfUpdated, 1)
      })

      it('should have deleted 0 paths', function () {
        Assert.equal(result.countOfDeleted, 0)
      })

      after(function () {
        return Promise.all([
          FileSystem.remove(`${option.path.source}/a.json`),
          FileSystem.remove(`${option.path.target}/${Configuration.name.content}`),
          FileSystem.remove(`${option.path.target}/${stamp.toFormat(Configuration.format.stamp)}`)
        ])
      })

    })

    describe('(with a deleted file in source)', function () {

      let rootPath = null
      let option = null

      let result = null

      before(async function () {

        rootPath = 'resource/test/library/archive/deleted'
        option = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${rootPath}/target`
          }
        }
  
        let _archive = Local.createArchive(option)

        await FileSystem.writeJson(`${option.path.source}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 })
        result = await _archive.synchronize(stamp)

        await FileSystem.remove(`${option.path.source}/a.json`),
        result = await _archive.synchronize(stamp)

      })

      it('should create a record of the original file', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${option.path.target}/${stamp.toFormat(Configuration.format.stamp)}/a.json`))
      })

      it('should have created 0 paths', function () {
        Assert.equal(result.countOfCreated, 0)
      })

      it('should have updated 0 paths', function () {
        Assert.equal(result.countOfUpdated, 0)
      })

      it('should have deleted 1 path', function () {
        Assert.equal(result.countOfDeleted, 1)
      })

      after(function () {
        return Promise.all([
          FileSystem.remove(`${option.path.target}/${Configuration.name.content}`),
          FileSystem.remove(`${option.path.target}/${stamp.toFormat(Configuration.format.stamp)}`)
        ])
      })

    })

    describe('(with an excluded file in source)', function () {

      let rootPath = null
      let option = null

      let result = null

      before(async function () {

        rootPath = 'resource/test/library/archive/excluded'
        option = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${rootPath}/target`,
            'exclude': 'b.txt'
          }
        }
  
        result = await Local.createArchive(option).synchronize(stamp)

      })

      it('should create the not excluded file', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${option.path.target}/${Configuration.name.content}/a.txt`))
      })

      it('should not create the excluded file', async function () {
        Assert.isFalse(await FileSystem.pathExists(`${option.path.target}/${Configuration.name.content}/b.txt`))
      })

      it('should have created 2 paths', function () {
        Assert.equal(result.countOfCreated, 2)
      })

      it('should have updated 1 paths', function () {
        Assert.equal(result.countOfUpdated, 1)
      })

      it('should have deleted 0 path', function () {
        Assert.equal(result.countOfDeleted, 0)
      })

      after(function () {
        return FileSystem.remove(`${option.path.target}/${Configuration.name.content}`)
      })

    })

    describe('(with an included file in source)', function () {

      let rootPath = null
      let option = null

      let result = null

      before(async function () {

        Configuration.merge({
          'parameter': {
            'rsync': {
              '--prune-empty-dirs': true
            }
          }
        })
            
        rootPath = 'resource/test/library/archive/included'
        option = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${rootPath}/target`,
            'include': [ '*/', 'configuration.json' ],
            'exclude': '*'
          }
        }
  
        result = await Local.createArchive(option).synchronize(stamp)

      })

      it('should create the included file', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${option.path.target}/${Configuration.name.content}/.lotho/configuration.json`))
      })

      it('should not create the excluded file', async function () {
        Assert.isFalse(await FileSystem.pathExists(`${option.path.target}/${Configuration.name.content}/.lotho/1.lock`))
      })

      it('should not create the excluded file', async function () {
        Assert.isFalse(await FileSystem.pathExists(`${option.path.target}/${Configuration.name.content}/.lotho/1.log`))
      })

      it('should have created 3 paths', function () {
        Assert.equal(result.countOfCreated, 3)
      })

      it('should have updated 1 paths', function () {
        Assert.equal(result.countOfUpdated, 1)
      })

      it('should have deleted 0 paths', function () {
        Assert.equal(result.countOfDeleted, 0)
      })

      after(async function () {

        await FileSystem.remove(`${option.path.target}/${Configuration.name.content}`)

        Configuration.merge({
          'parameter': {
            'rsync': {
              '--prune-empty-dirs': false
            }
          }
        })
            
      })

    })

    describe('(with an excluded file in target)', function () {

      let rootPath = null
      let option1 = null
      let option2 = null

      let result = null

      before(async function () {

        rootPath = 'resource/test/library/archive/excluded'

        option1 = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${rootPath}/target`
          }
        }
  
        option2 = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${rootPath}/target`,
            'exclude': 'b.txt'
          }
        }
  
        result = await Local.createArchive(option1).synchronize(stamp)
        result = await Local.createArchive(option2).synchronize(stamp)

      })

      it('should delete the excluded file', async function () {
        Assert.isFalse(await FileSystem.pathExists(`${option2.path.target}/${Configuration.name.content}/b.txt`))
      })

      it('should create a record of the excluded/deleted file', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${option2.path.target}/${stamp.toFormat(Configuration.format.stamp)}/b.txt`))
      })

      it('should have created 0 paths', function () {
        Assert.equal(result.countOfCreated, 0)
      })

      it('should have updated 0 paths', function () {
        Assert.equal(result.countOfUpdated, 0)
      })

      it('should have deleted 1 path', function () {
        Assert.equal(result.countOfDeleted, 1)
      })

      after(function () {
        return Promise.all([
          FileSystem.remove(`${option2.path.target}/${Configuration.name.content}`),
          FileSystem.remove(`${option2.path.target}/${stamp.toFormat(Configuration.format.stamp)}`)
        ])
      })

    })

    describe('(with a file in multiple sources ... )', function () {

      // Rsync silently overwrites the file in this case

      let rootPath = null
      let option = null

      before(function () {

        rootPath = 'resource/test/library/archive/multiple'
        option = {
          'name': this.test.parent.title,
          'path': {
            'source': [ `${rootPath}/source/a`, `${rootPath}/source/b` ],
            'target': `${rootPath}/target`
          }
        }
  
        return Local.createArchive(option).synchronize(stamp)

      })

      it('should create the file', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${option.path.target}/${Configuration.name.content}/a.txt`))
      })

      after(function () {
        return FileSystem.remove(`${option.path.target}/${Configuration.name.content}`)
      })

    })

  })

  describe('purge(stamp)', function () {

    let stamp = null

    before(function () {
      stamp = Configuration.now()  
    })

    ;[
      'second',
      'minute',
      'hour',
      'day',
      'month',
      'year'
    ].forEach((unit, index, allUnit) => {

      if (index > 0) {

        let largeUnit = unit
        let smallUnit = allUnit[index - 1]

        describe(`(when the age is less than one ${largeUnit})`, function () {

          let previous = null
          let previousAsString = null
  
          let rootPath = null
          let option = null
    
          before(function () {

            let duration = {}
            duration[`${largeUnit}s`] = 1
  
            let toStartOfLargeUnit = Interval.fromDateTimes(stamp.minus(Duration.fromObject(duration)), stamp).divideEqually(2)
            previous = stamp.minus(toStartOfLargeUnit[0].toDuration())
            previousAsString = previous.toFormat(Configuration.format.stamp)
  
            rootPath = 'resource/test/library/archive/empty'
            option = {
              'name': this.test.parent.title,
              'path': {
                'source': `${rootPath}/source`,
                'target': `${rootPath}/target`
              }
            }
    
          })

          describe(`(when the next date is the same ${smallUnit} and the file does not exist)`, function () {

            let next = null
            let nextAsString = null
      
            let result = null
            let value = null
      
            before(async function () {

              let toEndOfSmallUnit = Interval.fromDateTimes(previous, previous.endOf(smallUnit)).divideEqually(2)
              next = previous.plus(toEndOfSmallUnit[0].toDuration())
              nextAsString = next.toFormat(Configuration.format.stamp)
        
              await FileSystem.outputJson(`${option.path.target}/${previousAsString}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 })
              await FileSystem.mkdir(`${option.path.target}/${nextAsString}`, { 'recursive': true })

              result = await Local.createArchive(option).purge(stamp)
              value = (await FileSystem.readJson(`${option.path.target}/${nextAsString}/a.json`, { 'encoding': 'utf-8' })).value
      
            })

            it('should purge the previous directory', async function () {
              Assert.isFalse(await FileSystem.pathExists(`${option.path.target}/${previousAsString}`))
            })

            it('should have purged 1 paths', function () {
              Assert.equal(result.countOfPurged, 1)
            })

            it('should have the value \'abc\'', function () {
              Assert.equal(value, 'abc')
            })

            after(function () {
              return FileSystem.remove(`${option.path.target}/${nextAsString}`)
            })
      
          })

          describe(`(when the next date is the same ${smallUnit} and the file exists)`, function () {

            let next = null
            let nextAsString = null
      
            let result = null
            let value = null
      
            before(async function () {

              let toEndOfSmallUnit = Interval.fromDateTimes(previous, previous.endOf(smallUnit)).divideEqually(2)
              next = previous.plus(toEndOfSmallUnit[0].toDuration())
              nextAsString = next.toFormat(Configuration.format.stamp)
        
              await FileSystem.outputJson(`${option.path.target}/${previousAsString}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 })
              await FileSystem.outputJson(`${option.path.target}/${nextAsString}/a.json`, { 'value': 'def' }, { 'encoding': 'utf-8', 'spaces': 2 })

              result = await Local.createArchive(option).purge(stamp)
              value = (await FileSystem.readJson(`${option.path.target}/${nextAsString}/a.json`, { 'encoding': 'utf-8' })).value
      
            })

            it('should purge the previous directory', async function () {
              Assert.isFalse(await FileSystem.pathExists(`${option.path.target}/${previousAsString}`))
            })

            it('should have purged 1 paths', function () {
              Assert.equal(result.countOfPurged, 1)
            })

            it('should have the value \'def\'', function () {
              Assert.equal(value, 'def')
            })

            after(function () {
              return FileSystem.remove(`${option.path.target}/${nextAsString}`)
            })
      
          })

          describe(`(when the next date is a different ${smallUnit})`, function () {

            let next = null
            let nextAsString = null
      
            let result = null
      
            before(async function () {

              next = previous.endOf(smallUnit).plus(Duration.fromObject({ 'milliseconds': 1 }))
              nextAsString = next.toFormat(Configuration.format.stamp)
        
              await Promise.all([
                FileSystem.mkdir(`${option.path.target}/${previousAsString}`, { 'recursive': true }),
                FileSystem.mkdir(`${option.path.target}/${nextAsString}`, { 'recursive': true })
              ])

              result = await Local.createArchive(option).purge(stamp)
      
            })

            it('should not purge the previous directory', async function () {
              Assert.isTrue(await FileSystem.pathExists(`${option.path.target}/${previousAsString}`))
            })

            it('should have purged 0 paths', function () {
              Assert.equal(result.countOfPurged, 0)
            })

            after(function () {
              return Promise.all([
                FileSystem.remove(`${option.path.target}/${nextAsString}`),
                FileSystem.remove(`${option.path.target}/${previousAsString}`)
              ])
            })
      
          })

        })

      }

    })

    describe('(when the age is more than or equal to one year)', function () {

      let previous = null
      let previousAsString = null
  
      let rootPath = null
      let option = null

      before(function () {

        let toStartOfYear = Interval.fromDateTimes(stamp.minus(Duration.fromObject({ 'years': 3 })), stamp).divideEqually(2)
        previous = stamp.minus(toStartOfYear[0].toDuration())
        previousAsString = previous.toFormat(Configuration.format.stamp)
  
        rootPath = 'resource/test/library/archive/empty'
        option = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${rootPath}/target`
          }
        }

      })

      describe('(when the next date is the same year and the file does not exist)', function () {

        let next = null
        let nextAsString = null
  
        let result = null
        let value = null
  
        before(async function () {

          let toEndOfYear = Interval.fromDateTimes(previous, previous.endOf('year')).divideEqually(2)
          next = previous.plus(toEndOfYear[0].toDuration())
          nextAsString = next.toFormat(Configuration.format.stamp)
        
          await FileSystem.outputJson(`${option.path.target}/${previousAsString}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 })
          await FileSystem.mkdir(`${option.path.target}/${nextAsString}`, { 'recursive': true })

          result = await Local.createArchive(option).purge(stamp)
          value = (await FileSystem.readJson(`${option.path.target}/${nextAsString}/a.json`, { 'encoding': 'utf-8' })).value
 
        })

        it('should purge the previous directory', async function () {
          Assert.isFalse(await FileSystem.pathExists(`${option.path.target}/${previousAsString}`))
        })

        it('should have purged 1 paths', function () {
          Assert.equal(result.countOfPurged, 1)
        })

        it('should have the value \'abc\'', function () {
          Assert.equal(value, 'abc')
        })

        after(function () {
          return FileSystem.remove(`${option.path.target}/${nextAsString}`)
        })
  
      })

      describe('(when the next date is the same year and the file exists)', function () {

        let next = null
        let nextAsString = null
  
        let result = null
        let value = null
  
        before(async function () {

          let toEndOfYear = Interval.fromDateTimes(previous, previous.endOf('year')).divideEqually(2)
          next = previous.plus(toEndOfYear[0].toDuration())
          nextAsString = next.toFormat(Configuration.format.stamp)
        
          await FileSystem.outputJson(`${option.path.target}/${previousAsString}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 })
          await FileSystem.outputJson(`${option.path.target}/${nextAsString}/a.json`, { 'value': 'def' }, { 'encoding': 'utf-8', 'spaces': 2 })

          result = await Local.createArchive(option).purge(stamp)
          value = (await FileSystem.readJson(`${option.path.target}/${nextAsString}/a.json`, { 'encoding': 'utf-8' })).value
  
        })

        it('should purge the previous directory', async function () {
          Assert.isFalse(await FileSystem.pathExists(`${option.path.target}/${previousAsString}`))
        })

        it('should have purged 1 paths', function () {
          Assert.equal(result.countOfPurged, 1)
        })

        it('should have the value \'def\'', function () {
          Assert.equal(value, 'def')
        })

        after(function () {
          return FileSystem.remove(`${option.path.target}/${nextAsString}`)
        })
  
      })

      describe('(when the next date is a different year)', function () {

        let next = null
        let nextAsString = null
      
        let result = null
  
        before(async function () {

          next = previous.endOf('year').plus(Duration.fromObject({ 'milliseconds': 1 }))
          nextAsString = next.toFormat(Configuration.format.stamp)
        
          await Promise.all([
            FileSystem.mkdir(`${option.path.target}/${previousAsString}`, { 'recursive': true }),
            FileSystem.mkdir(`${option.path.target}/${nextAsString}`, { 'recursive': true })
          ])

          result = await Local.createArchive(option).purge(stamp)
  
        })

        it('should not purge the previous directory', async function () {
          Assert.isTrue(await FileSystem.pathExists(`${option.path.target}/${previousAsString}`))
        })

        it('should have purged 0 paths', function () {
          Assert.equal(result.countOfPurged, 0)
        })

        after(function () {
          return Promise.all([
            FileSystem.remove(`${option.path.target}/${nextAsString}`),
            FileSystem.remove(`${option.path.target}/${previousAsString}`)
          ])
        })
  
      })

    })
  
  })

  describe('startSchedule()', function () {

    let onCompleted = function (archive) {
      return new Promise((resolve) => {
        archive.once('completed', (result) => {
          resolve(result)
        })
        archive.startSchedule()
      })
    }

    let onStopped = function (archive) {
      return new Promise((resolve) => {
        archive.once('stopped', function () {
          resolve()
        })
        archive.stopSchedule()
      })
    }

    describe('(with an empty source)', function () {

      let rootPath = null
      let option = null

      let _archive = null
      let result = null

      before(async function () {

        rootPath = 'resource/test/library/archive/empty'
        option = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${rootPath}/target`
          },
          'schedule': '*/5 * * * * *'
        }
  
        result = await onCompleted(_archive = Local.createArchive(option))

      })

      it('should create the content directory', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${option.path.target}/${Configuration.name.content}`))
      })

      it('should have created 1 path', function () {
        Assert.equal(result.statistic.countOfCreated, 1)
      })

      it('should have updated 0 paths', function () {
        Assert.equal(result.statistic.countOfUpdated, 0)
      })

      it('should have deleted 0 paths', function () {
        Assert.equal(result.statistic.countOfDeleted, 0)
      })

      after(async function () {
        await onStopped(_archive)
        await FileSystem.remove(`${option.path.target}/${Configuration.name.content}`)
      })

    })

  })

  after(function () {
    Configuration.clear()
    Configuration.merge(Configuration.test)
  })

})
