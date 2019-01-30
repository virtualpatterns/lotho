import { assert as Assert } from 'chai'
import { Duration, Interval } from 'luxon'

import Archive from '../../library/archive'
import Configuration from '../../configuration'

describe('archive', function () {

  describe('isExpired(current, previous, next)', function () {

    let current = null

    before(function () {
      current = Configuration.now()  
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

          before(function () {

            let duration = {}
            duration[`${largeUnit}s`] = 1

            let toStartOfLargeUnit = Interval.fromDateTimes(current.minus(Duration.fromObject(duration)), current).divideEqually(2)
            previous = current.minus(toStartOfLargeUnit[0].toDuration())

          })

          describe(`(when the next date is the same ${smallUnit})`, function () {

            let next = null

            before(function () {
              let toEndOfSmallUnit = Interval.fromDateTimes(previous, previous.endOf(smallUnit)).divideEqually(2)
              next = previous.plus(toEndOfSmallUnit[0].toDuration())
            })

            it('should be expired', function () {
              Assert.isTrue(Archive.isExpired(current, previous, next))
            })
      
          })

          describe(`(when the next date is a different ${smallUnit})`, function () {

            let next = null

            before(function () {
              next = previous.endOf(smallUnit).plus(Duration.fromObject({ 'milliseconds': 1 }))
            })

            it('should not be expired', function () {
              Assert.isFalse(Archive.isExpired(current, previous, next))
            })
      
          })

        })

      }

    })

    describe('(when the age is more than or equal to one year)', function () {

      let previous = null

      before(function () {
        let toStartOfYear = Interval.fromDateTimes(current.minus(Duration.fromObject({ 'years': 3 })), current).divideEqually(2)
        previous = current.minus(toStartOfYear[0].toDuration())
      })

      describe('(when the next date is the same year)', function () {

        let next = null

        before(function () {
          let toEndOfYear = Interval.fromDateTimes(previous, previous.endOf('year')).divideEqually(2)
          next = previous.plus(toEndOfYear[0].toDuration())
        })

        it('should be expired', function () {
          Assert.isTrue(Archive.isExpired(current, previous, next))
        })
  
      })

      describe('(when the next date is a different year)', function () {

        let next = null

        before(function () {
          next = previous.endOf('year').plus(Duration.fromObject({ 'milliseconds': 1 }))
        })

        it('should not be expired', function () {
          Assert.isFalse(Archive.isExpired(current, previous, next))
        })
  
      })

    })
  
  })

})
