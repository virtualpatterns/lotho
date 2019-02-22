import { Log } from '@virtualpatterns/mablung'
import Merge from 'deepmerge'

import Archive from '../archive'
import Configuration from '../../configuration'

const archivePrototype = Archive.getArchivePrototype()
const purgedPrototype = Object.create(archivePrototype)

purgedPrototype.archive = async function (stamp = Configuration.now()) {
     
  let _result = await archivePrototype.archive.call(this, stamp)
    
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

const Purged = Object.create(Archive)

Purged.createArchive = function (option, prototype = purgedPrototype) {
  return Archive.createArchive.call(this, option, prototype)
}

Purged.getArchivePrototype = function () {
  return purgedPrototype
}

Purged.isArchive = function (purged) {
  return purgedPrototype.isPrototypeOf(purged)
}

export default Purged
