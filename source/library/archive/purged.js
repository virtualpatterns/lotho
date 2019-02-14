import Merge from 'deepmerge'

import Published from './published'
import Configuration from '../../configuration'

const publishedPrototype = Published.getArchivePrototype()
const purgedPrototype = Object.create(publishedPrototype)

purgedPrototype.archive = async function (stamp = Configuration.now()) {

  let result = await publishedPrototype.archive.call(this, stamp)
    
  let current = stamp
  let expired = await this.getExpired(current)

  for (let _expired of expired) {
    await this.copyExpired(_expired.previous, _expired.next)
    await this.deleteExpired(_expired.previous)
  }

  return { 'stamp': stamp, 'statistic': Merge(result.statistic, { 'countOfPurged': expired.length }) }

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
