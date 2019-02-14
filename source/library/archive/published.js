import { Log } from '@virtualpatterns/mablung'
import Schedule from 'cronstrue'
import { SNS } from 'aws-sdk'

import Archive from '../archive'
import Configuration from '../../configuration'

const archivePrototype = Archive.getArchivePrototype()
const publishedPrototype = Object.create(archivePrototype)

publishedPrototype.onScheduled = async function () {

  if (Configuration.isPublished) {

    let message = ''
    message += `Name: ${this.option.name}\n`
  
    this.option.path.source.forEach((path, index) => {
      message += `${index == 0 ? 'Source:' : ' and:' } ${path}\n`
    })
  
    message += `Target: ${this.option.path.target}\n`
  
    this.option.path.include.forEach((path, index) => {
      message += `${index == 0 ? 'Include:' : ' and:' }: ${path}\n`
    })
  
    this.option.path.exclude.forEach((path, index) => {
      message += `${index == 0 ? 'Exclude:' : ' and:' }: ${path}\n`
    })
  
    message += `Schedule: ${Schedule.toString(this.option.schedule, true)}`
  
    let option = Configuration.getOption({
      'Subject': `Archive '${this.option.name}' SCHEDULED`,
      'Message': message
    }, Configuration.option.SNS.message)
  
    await this.service.publish(option).promise()

  }

  archivePrototype.onScheduled.call(this)

}

publishedPrototype.onUnscheduled = async function () {

  if (Configuration.isPublished) {
      
    let option = Configuration.getOption({
      'Subject': `Archive '${this.option.name}' UNSCHEDULED`,
      'Message': 'No message'
    }, Configuration.option.SNS.message)

    await this.service.publish(option).promise()

  }

  archivePrototype.onUnscheduled.call(this)

}

publishedPrototype.onSucceeded = async function (result) {

  if (Configuration.isPublished) {
          
    let message = ''
    message += `Stamp: ${result.stamp.toFormat(Configuration.format.stamp)}\n`
    message += `Scanned: ${result.statistic.countOfScanned}\n`
    message += `Created: ${result.statistic.countOfCreated}\n`
    message += `Updated: ${result.statistic.countOfUpdated}\n`
    if (result.statistic.countOfDeleted) message += `Deleted: ${result.statistic.countOfDeleted}\n`
    message += `Purged: ${result.statistic.countOfPurged}`

    let option = Configuration.getOption({
      'Subject': `Archive '${this.option.name}' SUCCEEDED on '${Configuration.name.computer}'`,
      'Message': message
    }, Configuration.option.SNS.message)

    await this.service.publish(option).promise()

  }

  archivePrototype.onSucceeded.call(this, result)

}

publishedPrototype.onFailed = async function (error) {

  if (Configuration.isPublished) {
          
    let option = Configuration.getOption({
      'Subject': `Archive '${this.option.name}' FAILED`,
      'Message': error.stack
    }, Configuration.option.SNS.message)
  
    await this.service.publish(option).promise()

  }

  archivePrototype.onFailed.call(this, error)

}

const Published = Object.create(Archive)

Published.createArchive = function (option, prototype = publishedPrototype) {
  
  let published = Archive.createArchive.call(this, option, prototype)

  let _option = Configuration.getOption(Configuration.option.SNS.service)

  Log.trace(_option, 'SNS(option)')
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
