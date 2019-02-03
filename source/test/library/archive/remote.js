import { assert as Assert } from 'chai'
import { Duration, Interval } from 'luxon'
import { FileSystem } from '@virtualpatterns/mablung'

import Configuration from '../../../configuration'
import Remote from '../../../library/archive/remote'

describe('remote', function () {

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
      let targetPath = null
      let option = null

      let result = null

      before(async function () {

        rootPath = 'resource/test/library/archive/empty'
        targetPath = `${rootPath}/target`
        option = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${Configuration.name.computer}.local:"${__dirname}/../../../../${rootPath}/target"`
          }
        }

        result = await Remote.createArchive(option).synchronize(stamp)

      })

      it('should create the content directory', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath}/${Configuration.name.content}`))
      })

      it('should have created 1 path', function () {
        Assert.equal(result.countOfCreated, 1)
      })

      it('should have updated 0 paths', function () {
        Assert.equal(result.countOfUpdated, 0)
      })

      after(function () {
        return FileSystem.remove(`${targetPath}/${Configuration.name.content}`)
      })

    })

    describe('(with an updated file in source)', function () {

      let rootPath = null
      let targetPath = null
      let option = null

      let result = null

      before(async function () {

        rootPath = 'resource/test/library/archive/updated'
        targetPath = `${rootPath}/target`
        option = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${Configuration.name.computer}.local:"${__dirname}/../../../../${rootPath}/target"`
          }
        }
  
        let _archive = Remote.createArchive(option)

        await FileSystem.writeJson(`${option.path.source}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 })
        result = await _archive.synchronize(stamp)

        await wait(1000)

        await FileSystem.writeJson(`${option.path.source}/a.json`, { 'value': 'def' }, { 'encoding': 'utf-8', 'spaces': 2 })
        result = await _archive.synchronize(stamp)

      })

      it('should create a record of the original file', async function () {
        Assert.isTrue(await FileSystem.pathExists(`${targetPath}/${stamp.toFormat(Configuration.format.stamp)}/a.json`))
      })

      it('should have created 0 paths', function () {
        Assert.equal(result.countOfCreated, 0)
      })

      it('should have updated 1 path', function () {
        Assert.equal(result.countOfUpdated, 1)
      })

      after(function () {
        return Promise.all([
          FileSystem.remove(`${option.path.source}/a.json`),
          FileSystem.remove(`${targetPath}/${Configuration.name.content}`),
          FileSystem.remove(`${targetPath}/${stamp.toFormat(Configuration.format.stamp)}`)
        ])
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
          let targetPath = null
          let option = null
    
          before(function () {

            let duration = {}
            duration[`${largeUnit}s`] = 1
  
            let toStartOfLargeUnit = Interval.fromDateTimes(stamp.minus(Duration.fromObject(duration)), stamp).divideEqually(2)
            previous = stamp.minus(toStartOfLargeUnit[0].toDuration())
            previousAsString = previous.toFormat(Configuration.format.stamp)
  
            rootPath = 'resource/test/library/archive/empty'
            targetPath = `${rootPath}/target`
            option = {
              'name': this.test.parent.title,
              'path': {
                'source': `${rootPath}/source`,
                'target': `${Configuration.name.computer}.local:${__dirname}/../../../../${rootPath}/target`
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
        
              await FileSystem.outputJson(`${targetPath}/${previousAsString}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 })
              await FileSystem.mkdir(`${targetPath}/${nextAsString}`, { 'recursive': true })

              result = await Remote.createArchive(option).purge(stamp)
              value = (await FileSystem.readJson(`${targetPath}/${nextAsString}/a.json`, { 'encoding': 'utf-8' })).value
     
            })

            it('should purge the previous directory', async function () {
              Assert.isFalse(await FileSystem.pathExists(`${targetPath}/${previousAsString}`))
            })

            it('should have purged 1 paths', function () {
              Assert.equal(result.countOfPurged, 1)
            })

            it('should have the value \'abc\'', function () {
              Assert.equal(value, 'abc')
            })

            after(function () {
              return FileSystem.remove(`${targetPath}/${nextAsString}`)
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
        
              await FileSystem.outputJson(`${targetPath}/${previousAsString}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 })
              await FileSystem.outputJson(`${targetPath}/${nextAsString}/a.json`, { 'value': 'def' }, { 'encoding': 'utf-8', 'spaces': 2 })

              result = await Remote.createArchive(option).purge(stamp)
              value = (await FileSystem.readJson(`${targetPath}/${nextAsString}/a.json`, { 'encoding': 'utf-8' })).value
     
            })

            it('should purge the previous directory', async function () {
              Assert.isFalse(await FileSystem.pathExists(`${targetPath}/${previousAsString}`))
            })

            it('should have purged 1 paths', function () {
              Assert.equal(result.countOfPurged, 1)
            })

            it('should have the value \'def\'', function () {
              Assert.equal(value, 'def')
            })

            after(function () {
              return FileSystem.remove(`${targetPath}/${nextAsString}`)
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
                FileSystem.mkdir(`${targetPath}/${previousAsString}`, { 'recursive': true }),
                FileSystem.mkdir(`${targetPath}/${nextAsString}`, { 'recursive': true })
              ])

              result = await Remote.createArchive(option).purge(stamp)
      
            })

            it('should not purge the previous directory', async function () {
              Assert.isTrue(await FileSystem.pathExists(`${targetPath}/${previousAsString}`))
            })

            it('should have purged 0 paths', function () {
              Assert.equal(result.countOfPurged, 0)
            })

            after(function () {
              return Promise.all([
                FileSystem.remove(`${targetPath}/${nextAsString}`),
                FileSystem.remove(`${targetPath}/${previousAsString}`)
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
      let targetPath = null
      let option = null

      before(function () {

        let toStartOfYear = Interval.fromDateTimes(stamp.minus(Duration.fromObject({ 'years': 3 })), stamp).divideEqually(2)
        previous = stamp.minus(toStartOfYear[0].toDuration())
        previousAsString = previous.toFormat(Configuration.format.stamp)
  
        rootPath = 'resource/test/library/archive/empty'
        targetPath = `${rootPath}/target`
        option = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${Configuration.name.computer}.local:${__dirname}/../../../../${rootPath}/target`
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
        
          await FileSystem.outputJson(`${targetPath}/${previousAsString}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 })
          await FileSystem.mkdir(`${targetPath}/${nextAsString}`, { 'recursive': true })

          result = await Remote.createArchive(option).purge(stamp)
          value = (await FileSystem.readJson(`${targetPath}/${nextAsString}/a.json`, { 'encoding': 'utf-8' })).value
  
        })

        it('should purge the previous directory', async function () {
          Assert.isFalse(await FileSystem.pathExists(`${targetPath}/${previousAsString}`))
        })

        it('should have purged 1 paths', function () {
          Assert.equal(result.countOfPurged, 1)
        })

        it('should have the value \'abc\'', function () {
          Assert.equal(value, 'abc')
        })

        after(function () {
          return FileSystem.remove(`${targetPath}/${nextAsString}`)
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
        
          await FileSystem.outputJson(`${targetPath}/${previousAsString}/a.json`, { 'value': 'abc' }, { 'encoding': 'utf-8', 'spaces': 2 })
          await FileSystem.outputJson(`${targetPath}/${nextAsString}/a.json`, { 'value': 'def' }, { 'encoding': 'utf-8', 'spaces': 2 })

          result = await Remote.createArchive(option).purge(stamp)
          value = (await FileSystem.readJson(`${targetPath}/${nextAsString}/a.json`, { 'encoding': 'utf-8' })).value
  
        })

        it('should purge the previous directory', async function () {
          Assert.isFalse(await FileSystem.pathExists(`${targetPath}/${previousAsString}`))
        })

        it('should have purged 1 paths', function () {
          Assert.equal(result.countOfPurged, 1)
        })

        it('should have the value \'def\'', function () {
          Assert.equal(value, 'def')
        })

        after(function () {
          return FileSystem.remove(`${targetPath}/${nextAsString}`)
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
            FileSystem.mkdir(`${targetPath}/${previousAsString}`, { 'recursive': true }),
            FileSystem.mkdir(`${targetPath}/${nextAsString}`, { 'recursive': true })
          ])

          result = await Remote.createArchive(option).purge(stamp)
  
        })

        it('should not purge the previous directory', async function () {
          Assert.isTrue(await FileSystem.pathExists(`${targetPath}/${previousAsString}`))
        })

        it('should have purged 0 paths', function () {
          Assert.equal(result.countOfPurged, 0)
        })

        after(function () {
          return Promise.all([
            FileSystem.remove(`${targetPath}/${nextAsString}`),
            FileSystem.remove(`${targetPath}/${previousAsString}`)
          ])
        })
  
      })

    })
  
  })

  after(function () {
    Configuration.clear()
    Configuration.merge(Configuration.test)
  })

})
