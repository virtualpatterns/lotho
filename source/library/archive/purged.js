import { Log } from '@virtualpatterns/mablung'
import Merge from 'deepmerge'

import Published from './published'
import Configuration from '../../configuration'

const publishedPrototype = Published.getArchivePrototype()
const purgedPrototype = Object.create(publishedPrototype)

purgedPrototype.archive = async function (stamp = Configuration.now()) {
     
  let _result = await publishedPrototype.archive.call(this, stamp)
    
  Log.debug(`Purging '${this.option.name}' ...`)

  let current = stamp
  let expired = await this.getExpired(current)

  for (let _expired of expired) {
    await this.copyExpired(_expired.previous, _expired.next)
    await this.deleteExpired(_expired.previous)
  }

  let result = { 'stamp': stamp, 'statistic': Merge(_result.statistic, { 'countOfPurged': expired.length }) }

  Log.debug(`Purged: ${result.statistic.countOfPurged}`)
  return result

}

const Purged = Object.create(Published)

Purged.createArchive = function (option, prototype = purgedPrototype) {
  return Published.createArchive.call(this, option, prototype)
}

Purged.getArchivePrototype = function () {
  return purgedPrototype
}

Purged.isArchive = function (purged) {
  return purgedPrototype.isPrototypeOf(purged)
}

export default Purged