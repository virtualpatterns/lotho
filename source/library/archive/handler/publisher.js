import { Log } from '@virtualpatterns/mablung'
// import Property from 'object-path'
// import Schedule from 'cronstrue'
import { SNS } from 'aws-sdk'

import Configuration from '../../../configuration'
import Handler from '../handler'

const handlerPrototype = Handler.getHandlerPrototype()
const publisherPrototype = Object.create(handlerPrototype)

// publisherPrototype.onScheduled = async function () {

//   try {

//     let message = ''
//     message += `Name: ${this.archive.option.name}\n`
  
//     this.archive.option.path.source.forEach((path, index) => {
//       message += `${index == 0 ? 'Source:' : 'and:' } ${path}\n`
//     })
  
//     message += `Target: ${this.archive.option.path.target}\n`
  
//     this.archive.option.path.include.forEach((path, index) => {
//       message += `${index == 0 ? 'Include:' : 'and:' } ${path}\n`
//     })
  
//     this.archive.option.path.exclude.forEach((path, index) => {
//       message += `${index == 0 ? 'Exclude:' : 'and:' } ${path}\n`
//     })
  
//     message += `Schedule: ${Schedule.toString(this.archive.option.schedule, true)}`
  
//     let option = Configuration.getOption({
//       'Subject': `'${this.archive.option.name}' scheduled`,
//       'Message': message
//     }, Configuration.option.SNS.message)
  
//     if (Configuration.isPublished) {
//       Log.trace(Configuration.omit(option), 'SNS.publish(option) ...')
//       let data = await this.service.publish(option).promise()
//       Log.trace(data, 'SNS.publish(option)')
//     }
  
//     Log.debug(`${Configuration.isPublished ? 'Published' : 'Unpublished'}: ${option.Subject}\n\n${option.Message}\n`)
  
//     handlerPrototype.onScheduled.call(this)

//   }
//   catch (error) {
//     Log.error(error, 'Publisher.onScheduled()')
//   }

// }

// publisherPrototype.onSucceeded = async function (result) {

//   try {

//     let isPublished = Configuration.isPublished && 
//     result.statistic.countOfCreated +
//     result.statistic.countOfUpdated +
//     Property.get(result.statistic, 'countOfDeleted', 0) > 0

//     let message = ''
//     message += `Stamp: ${result.stamp.toFormat(Configuration.format.stamp)}\n`
//     message += `Scanned: ${result.statistic.countOfScanned}\n`
//     message += `Created: ${result.statistic.countOfCreated}\n`
//     message += `Updated: ${result.statistic.countOfUpdated}\n`
//     message += `Deleted: ${Property.get(result.statistic, 'countOfDeleted', '(unknown)')}\n`
//     message += `Purged: ${result.statistic.countOfPurged}`

//     let option = Configuration.getOption({
//       'Subject': `'${this.archive.option.name}' succeeded`,
//       'Message': message
//     }, Configuration.option.SNS.message)

//     if (isPublished) {
//       Log.trace(Configuration.omit(option), 'SNS.publish(option) ...')
//       let data = await this.service.publish(option).promise()
//       Log.trace(data, 'SNS.publish(option)')
//     }

//     Log.debug(`${isPublished ? 'Published' : 'Unpublished'}: ${option.Subject}\n\n${option.Message}\n`)

//     handlerPrototype.onSucceeded.call(this, result)

//   }
//   catch (error) {
//     Log.error(error, 'Publisher.onSucceeded(result)')
//   }

// }

publisherPrototype.onFailed = async function (error) {

  try {

    let option = Configuration.getOption({
      'Subject': `'${this.archive.option.name}' FAILED`,
      'Message': error.stack
    }, Configuration.option.SNS.message)
  
    if (Configuration.isPublished) {         
      Log.trace(Configuration.omit(option), 'SNS.publish(option) ...')
      let data = await this.service.publish(option).promise()
      Log.trace(data, 'SNS.publish(option)')
    }
  
    Log.debug(`${Configuration.isPublished ? 'Published' : 'Unpublished'}: ${option.Subject}\n\n${option.Message}\n`)
  
    handlerPrototype.onFailed.call(this, error)
  
  }
  catch (error) {
    Log.error(error, 'Publisher.onFailed(error)')
  }

}

// publisherPrototype.onUnscheduled = async function () {

//   try {

//     let option = Configuration.getOption({
//       'Subject': `'${this.archive.option.name}' unscheduled`,
//       'Message': '(No message)'
//     }, Configuration.option.SNS.message)
    
//     if (Configuration.isPublished) {
//       Log.trace(Configuration.omit(option), 'SNS.publish(option) ...')
//       let data = await this.service.publish(option).promise()
//       Log.trace(data, 'SNS.publish(option)')
//     }
  
//     Log.debug(`${Configuration.isPublished ? 'Published' : 'Unpublished'}: ${option.Subject}`)
  
//     handlerPrototype.onUnscheduled.call(this)
  
//   }
//   catch (error) {
//     Log.error(error, 'Publisher.onUnscheduled()')
//   }

// }

const Publisher = Object.create(Handler)

Publisher.createHandler = function (archive, prototype = publisherPrototype) {
  
  let publisher = Handler.createHandler.call(this, archive, prototype)
  let option = Configuration.getOption(Configuration.option.SNS.service)

  if (Configuration.isPublished) {         
    Log.trace(Configuration.redact(option), 'SNS(option)')
    publisher.service = new SNS(option)
  }

  return publisher

}

Publisher.getHandlerPrototype = function () {
  return publisherPrototype
}

Publisher.isHandler = function (publisher) {
  return publisherPrototype.isPrototypeOf(publisher)
}

export default Publisher
