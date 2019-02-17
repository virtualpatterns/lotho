import { FileSystem, Log } from '@virtualpatterns/mablung'

import Configuration from '../../../configuration'
import _Local from '../../../library/archive/local'

describe('published', function () {

  const _localPrototype = _Local.getArchivePrototype()
  const localPrototype = Object.create(_localPrototype)

  localPrototype.whenScheduled = function () {
    return new Promise(async (resolve, reject) => {

      try {

        this.once('scheduled', (result) => {
          resolve(result)
        })

        await this.startSchedule()

      }
      catch (error) {
        reject(error)
      }

    })
  }

  localPrototype.whenUnscheduled = function () {
    return new Promise(async (resolve, reject) => {

      try {

        this.once('unscheduled', (result) => {
          resolve(result)
        })

        await this.stopSchedule()

      }
      catch (error) {
        reject(error)
      }

    })
  }

  localPrototype.whenSucceeded = function () {
    return new Promise(async (resolve, reject) => {

      try {

        this.once('succeeded', (result) => {
          resolve(result)
        })

      }
      catch (error) {
        reject(error)
      }

    })
  }

  localPrototype.whenFailed = function () {
    return new Promise(async (resolve) => {

      try {

        this.once('failed', (result) => {
          resolve(result)
        })

      }
      catch (error) {
        Log.error(error, 'catch (error) { ... }')
      }

    })
  }

  const Local = Object.create(_Local)

  Local.createArchive = function (option, prototype = localPrototype) {
    return _Local.createArchive.call(this, option, prototype)
  }

  Local.getArchivePrototype = function () {
    return localPrototype
  }

  Local.isArchive = function (purged) {
    return localPrototype.isPrototypeOf(purged)
  }
  
  describe('archive(stamp)', function () {

    describe('(with an empty source)', function () {

      let option = null
      let archive = null
    
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
    
      })
    
      describe('onScheduled()', function () {
    
        it('should publish (2)', function () {
          return archive.whenScheduled()
        })
  
        after(async function () {
          await archive.whenUnscheduled(),
          await FileSystem.remove(`${option.path.target}/${Configuration.name.content}`)
        })
  
      })
    
      describe('onSucceeded(result)', function () {
    
        before(function () {
          return archive.whenScheduled()
        })
  
        it('should publish (3)', function () {
          return archive.whenSucceeded()
        })
  
        it('should not publish', function () {
          return archive.whenSucceeded()
        })
  
        after(async function () {
          await archive.whenUnscheduled(),
          await FileSystem.remove(`${option.path.target}/${Configuration.name.content}`)
        })
  
      })
    
      describe('onUnscheduled()', function () {
    
        before(function () {
          return archive.whenScheduled()
        })
  
        it('should publish (2)', function () {
          return archive.whenUnscheduled()
        })
  
        after(function () {
          return FileSystem.remove(`${option.path.target}/${Configuration.name.content}`)
        })
    
      })
    
      after(function () {
        Configuration.clear()
        Configuration.merge(Configuration.test)
      })
  
    })
    
    describe('(with an a non-existent source and target)', function () {
  
      let option = null
      let archive = null
    
      before(async function () {
    
        Configuration.merge(Configuration.path.configuration)
    
        let rootPath = 'resource/test/library/archive/non-existent'

        option = {
          'name': this.test.parent.title,
          'path': {
            'source': `${rootPath}/source`,
            'target': `${rootPath}/target`
          },
          'schedule': '*/2 * * * * *'
        }
    
        archive = Local.createArchive(option)
    
      })
    
      describe('onFailed(error)', function () {
    
        before(function () {
          return archive.whenScheduled()
        })
  
        it('should publish (3)', function () {
          return archive.whenFailed()
        })
  
        after(function () {
          return archive.whenUnscheduled()
        })
  
      })
    
      after(function () {
        Configuration.clear()
        Configuration.merge(Configuration.test)
      })
  
    })
  
  })

})
