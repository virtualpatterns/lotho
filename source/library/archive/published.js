import { Log } from '@virtualpatterns/mablung'
import Schedule from 'cronstrue'
import { SNS } from 'aws-sdk'

import Archive from '../archive'
import Configuration from '../../configuration'
import Is from '../utility/is'

const archivePrototype = Archive.getArchivePrototype()
const publishedPrototype = Object.create(archivePrototype)

publishedPrototype.onScheduled = async function () {

  if (Configuration.isPublished) {

    let message = ''
    message += `Name: ${this.option.name}\n`
  
    this.option.path.source.forEach((path, index) => {
      message += `${index == 0 ? 'Source:' : 'and:' } ${path}\n`
    })
  
    message += `Target: ${this.option.path.target}\n`
  
    this.option.path.include.forEach((path, index) => {
      message += `${index == 0 ? 'Include:' : 'and:' } ${path}\n`
    })
  
    this.option.path.exclude.forEach((path, index) => {
      message += `${index == 0 ? 'Exclude:' : 'and:' } ${path}\n`
    })
  
    message += `Schedule: ${Schedule.toString(this.option.schedule, true)}`
  
    let option = Configuration.getOption({
      'Subject': `'${this.option.name}' scheduled`,
      'Message': message
    }, Configuration.option.SNS.message)
  
    Log.debug(Configuration.omit(option), 'SNS.publish(option) ...')
    let data = await this.service.publish(option).promise()
    Log.debug(data, 'SNS.publish(option)')

  }

  archivePrototype.onScheduled.call(this)

}

publishedPrototype.onUnscheduled = async function () {

  if (Configuration.isPublished) {
      
    let option = Configuration.getOption({
      'Subject': `'${this.option.name}' unscheduled`,
      'Message': 'No message'
    }, Configuration.option.SNS.message)
  
    Log.debug(Configuration.omit(option), 'SNS.publish(option) ...')
    let data = await this.service.publish(option).promise()
    Log.debug(data, 'SNS.publish(option)')

  }

  archivePrototype.onUnscheduled.call(this)

}

publishedPrototype.onSucceeded = async function (result) {

  if (Configuration.isPublished &&
      result.statistic.countOfCreated +
      result.statistic.countOfUpdated +
      (result.statistic.countOfDeleted || 0) +
      result.statistic.countOfPurged > 0) {
          
    let message = ''
    message += `Stamp: ${result.stamp.toFormat(Configuration.format.stamp)}\n`
    message += `Scanned: ${result.statistic.countOfScanned}\n`
    message += `Created: ${result.statistic.countOfCreated}\n`
    message += `Updated: ${result.statistic.countOfUpdated}\n`
    if (Is.not.undefined(result.statistic.countOfDeleted)) message += `Deleted: ${result.statistic.countOfDeleted}\n`
    message += `Purged: ${result.statistic.countOfPurged}`

    let option = Configuration.getOption({
      'Subject': `'${this.option.name}' succeeded`,
      'Message': message
    }, Configuration.option.SNS.message)
  
    Log.debug(Configuration.omit(option), 'SNS.publish(option) ...')
    let data = await this.service.publish(option).promise()
    Log.debug(data, 'SNS.publish(option)')

  }

  archivePrototype.onSucceeded.call(this, result)

}

publishedPrototype.onFailed = async function (error) {

  if (Configuration.isPublished) {
          
    let option = Configuration.getOption({
      'Subject': `'${this.option.name}' FAILED`,
      'Message': error.stack
    }, Configuration.option.SNS.message)
  
    Log.debug(Configuration.omit(option), 'SNS.publish(option) ...')
    let data = await this.service.publish(option).promise()
    Log.debug(data, 'SNS.publish(option)')

  }

  archivePrototype.onFailed.call(this, error)

}

const Published = Object.create(Archive)

Published.createArchive = function (option, prototype = publishedPrototype) {
  
  let published = Archive.createArchive.call(this, option, prototype)
  let _option = Configuration.getOption(Configuration.option.SNS.service)

  Log.debug(Configuration.redact(_option), 'SNS(option)')
  published.service = new SNS(_option)

  return published

}

Published.getArchivePrototype = function () {
  return publishedPrototype
}

Published.isArchive = function (published) {
  return publishedPrototype.isPrototypeOf(published)
}

export default Published
