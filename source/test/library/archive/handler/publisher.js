
import Configuration from '../../../../configuration'
import Local from '../../../../library/archive/local'
import Publisher from '../../../../library/archive/handler/publisher'

import { ArchiveArchiveError } from '../../../../library/error/archive-error'

describe('publisher', function () {

  describe('(with an empty source)', function () {

    let option = null
    let archive = null
    let publisher = null
  
    before(async function () {
  
      Configuration.merge(Configuration.path.configuration)
  
      let rootPath = 'resource/test/library/archive/empty'

      option = {
        'name': this.test.parent.title,
        'path': {
          'source': `${rootPath}/source`,
          'target': `${rootPath}/target`
        },
        'schedule': '*/5 * * * * *'
      }
  
      archive = Local.createArchive(option)
      publisher = Publisher.createHandler(archive)
  
    })
  
    describe('onScheduled()', function () {
  
      it('should publish', function () {
        return publisher.onScheduled()
      })

    })
  
    describe('onSucceeded(result)', function () {

      it('should publish', function () {
        return publisher.onSucceeded({
          'stamp': Configuration.now(),
          'statistic': {
            'countOfScanned': 1,
            'countOfCreated': 2,
            'countOfUpdated': 3,
            'countOfDeleted': 4,
            'countOfPurged': 5
          }
        })
      })

      it('should publish', function () {
        return publisher.onSucceeded({
          'stamp': Configuration.now(),
          'statistic': {
            'countOfScanned': 1,
            'countOfCreated': 2,
            'countOfUpdated': 3,
            'countOfPurged': 5
          }
        })
      })

      it('should not publish', function () {
        return publisher.onSucceeded({
          'stamp': Configuration.now(),
          'statistic': {
            'countOfScanned': 10,
            'countOfCreated': 0,
            'countOfUpdated': 0,
            'countOfDeleted': 0,
            'countOfPurged': 5
          }
        })
      })

    })
  
    describe('onFailed(error)', function () {

      it('should publish', function () {
        return publisher.onFailed(new ArchiveArchiveError())
      })

    })
  
    describe('onUnscheduled()', function () {

      it('should publish', function () {
        return publisher.onUnscheduled()
      })
  
    })
  
    after(function () {
      Configuration.clear()
      Configuration.merge(Configuration.test)
    })

  })

})
