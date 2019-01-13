import { Duration, DateTime } from 'luxon'
import Is from '@pwn/is'
import Merge from 'deepmerge'
import Moment from 'moment-timezone'
import OS from 'os'
import { Path, Process } from '@virtualpatterns/mablung'

const MILLISECONDS_PER_SECOND = 1000
const NANOSECONDS_PER_SECOND = 1000000000

const configurationPrototype = {
  'conversion': {
    'toDuration': ([ seconds, nanoseconds ]) => Duration.fromMillis((seconds + nanoseconds / NANOSECONDS_PER_SECOND) * MILLISECONDS_PER_SECOND),
    'toMilliseconds': (value) => {

      if (Is.array(value)) {
        let [ seconds, nanoseconds ] = value
        return (seconds + nanoseconds / NANOSECONDS_PER_SECOND) * MILLISECONDS_PER_SECOND
      }
      else if (value.user &&
               value.system) {
        return value.user + value.system
      }

    },
    'toSeconds': ([ seconds, nanoseconds ]) => (seconds + nanoseconds / NANOSECONDS_PER_SECOND).toFixed(2)
  },
  'format': {
    'longDuration': 'hh\'h\' mm\'m\' ss.SSSS\'s\'',
    'longSchedule': '\'on\' DDDD \'at\' tt',
    'stamp': 'x'
  },
  'computerName': OS.hostname().match(/^[^.]+/),
  'line': '-'.repeat(80),
  'logLevel': 'debug',
  'logPath': 'console', // `${Process.env.HOME}/Library/Logs/lotho/lotho.log`,
  'now': () => DateTime.utc(),
  'parameter': {
    'rsync': {
      '--archive': true,
      '--backup': true,
      '--delete': true,
      '--delete-excluded': true,
      '--executability': true,
      '--itemize-changes': true,
      '--relative': true,
      '--rsh=ssh': true,
      '--stats': true,
      '--times': true,
      '--whole-file': true
    }
  },
  'path': {
    'home': `${Process.env.HOME}/.lotho`,
    'configuration': `${Process.env.HOME}/.lotho/configuration.json`,
    'source': [],
    'target': null,
    'exclude': [],
    'rsync': '/usr/local/bin/rsync'
  },
  'pattern': {
    'change': /^([<>ch\\.\\*]\S+)\s+(.*)$/,
    'countOfScanned': /number of files: ([\d,]+)/im, // Number of files: 10,277 (reg: 9,432, dir: 845)
    'countOfCreated': /number of created files: ([\d,]+)/im, // Number of created files: 10,277 (reg: 9,432, dir: 845)
    'countOfUpdated': /number of regular files transferred: ([\d,]+)/im, // Number of regular files transferred: 9,432
    'countOfDeleted': /number of deleted files: ([\d,]+)/im, // Number of deleted files: 0
    'sumOfBytes': /sent ([\d,]+) bytes\s+received ([\d,]+) bytes\s+([\d,\\.]+) bytes\/sec/im // sent 259,761,968 bytes  received 212,802 bytes  14,855,701.14 bytes/sec
  },
  'range': {
    'progressInSeconds':  {
      'minimum': 1.0,
      'maximum': Infinity
    }
  },
  'schedule': '0 0 */1 * * *', // Every hour at 0 seconds and 0 minutes past the hour
  'timeZone': Moment.tz.guess(),
  'task': {
    'logLevel': 'debug',
    'logPath': `${Process.env.HOME}/Library/Logs/lotho/lotho-task.log`
  },
  'test': {
    'logLevel': 'debug',
    'logPath': `${Process.env.HOME}/Library/Logs/lotho/lotho-test.log`,
    'parameter': {
      'index': {}
    },
    'path': {
      'configuration': Path.normalize(`${__dirname}/../resource/source/configuration.json`),
      'index': 'distributable/index.js'
    }
  }
}

const Configuration = Object.create(configurationPrototype)

Configuration.merge = function (value = Configuration.path.configuration) {
  Object.setPrototypeOf(Configuration, Merge(Object.getPrototypeOf(Configuration), (Is.string(value) ? require(value) : value)))
}

Configuration.clear = function () {
  Object.setPrototypeOf(Configuration, configurationPrototype)
}

export default Configuration
