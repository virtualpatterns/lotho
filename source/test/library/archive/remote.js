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

          describe(`(when the next date is the same ${smallUnit})`, function () {

            let next = null
            let nextAsString = null
      
            let result = null
      
            before(async function () {

              let toEndOfSmallUnit = Interval.fromDateTimes(previous, previous.endOf(smallUnit)).divideEqually(2)
              next = previous.plus(toEndOfSmallUnit[0].toDuration())
              nextAsString = next.toFormat(Configuration.format.stamp)
        
              await Promise.all([
                FileSystem.mkdir(`${targetPath}/${previousAsString}`, { 'recursive': true }),
                FileSystem.mkdir(`${targetPath}/${nextAsString}`, { 'recursive': true })
              ])

              result = await Remote.createArchive(option).purge(stamp)
      
            })

            it('should purge the previous directory', async function () {
              Assert.isFalse(await FileSystem.pathExists(`${targetPath}/${previousAsString}`))
            })

            it('should have purged 1 paths', function () {
              Assert.equal(result.countOfPurged, 1)
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

      describe('(when the next date is the same year)', function () {

        let next = null
        let nextAsString = null
  
        let result = null
  
        before(async function () {

          let toEndOfYear = Interval.fromDateTimes(previous, previous.endOf('year')).divideEqually(2)
          next = previous.plus(toEndOfYear[0].toDuration())
          nextAsString = next.toFormat(Configuration.format.stamp)
        
          await Promise.all([
            FileSystem.mkdir(`${targetPath}/${previousAsString}`, { 'recursive': true }),
            FileSystem.mkdir(`${targetPath}/${nextAsString}`, { 'recursive': true })
          ])

          result = await Remote.createArchive(option).purge(stamp)
  
        })

        it('should purge the previous directory', async function () {
          Assert.isFalse(await FileSystem.pathExists(`${targetPath}/${previousAsString}`))
        })

        it('should have purged 1 paths', function () {
          Assert.equal(result.countOfPurged, 1)
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
