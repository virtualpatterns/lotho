import { Duration, DateTime } from 'luxon'
import Is from '@pwn/is'
import Merge from 'deepmerge'
import OS from 'os'
import { Path, Process } from '@virtualpatterns/mablung'

import Package from '../package.json'

const COMPUTER_NAME = OS.hostname().match(/^[^.]+/)
const MILLISECONDS_PER_SECOND = 1000
const NANOSECONDS_PER_SECOND = 1000000000

const configurationPrototype = {
  'archive': [
    {
      'name': Package.name,
      'path': {      
        'source': [ '' ],
        'target': '',
        'exclude': [ '' ]
      },
      'schedule': ''
    }
  ],
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
  'default': {
    'archive': [
      {
        'name': Package.name,
        'path': {
          'source': [ `${Process.env.HOME}/.lotho` ],
          'target': `BUCKBEAK.local:/Volumes/BUCKBEAK1/Backup/${COMPUTER_NAME}`,
          'exclude': [
            '.DS_Store',
            '.localized',
            'Icon\\#015',
            '*.lock'
          ]
        },
        'schedule': '0 0 */1 * * *'
      }
    ]
  },
  'format': {
    'longDuration': 'hh\'h\' mm\'m\' ss.SSSS\'s\'',
    'longSchedule': '\'on\' DDDD \'at\' tt',
    'stamp': 'x'
  },
  'computerName': COMPUTER_NAME,
  'line': '-'.repeat(80),
  'logLevel': 'debug',
  'logPath': 'console', // `${Process.env.HOME}/.lotho/lotho.log`,
  'now': () => DateTime.utc(),
  'parameter': {
    'pm2': {
      '–-mini-list': true
    },
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
    },
    'start': {
      'run-schedule': true,
      '--configurationPath': () => Configuration.path.configuration,
      '--logLevel': () => Configuration.logLevel,
      '--logPath': () => Configuration.logPath
    }
  },
  'path': {
    'configuration': `${Process.env.HOME}/.lotho/configuration.json`,
    'home': `${Process.env.HOME}/.lotho`,
    'source': [],
    'target': null,
    'exclude': [],
    'pm2': Path.normalize(`${__dirname}/../node_modules/pm2/bin/pm2`),
    'rsync': '/usr/local/bin/rsync',
    'start': Path.normalize(`${__dirname}/lotho.js`)
  },
  'pattern': {
    'change': /^([<>ch\\.\\*]\S+)\s+(.*)$/,
    'countOfScanned': /number of files: ([\d,]+)/im,
    'countOfCreated': /number of created files: ([\d,]+)/im,
    'countOfUpdated': /number of regular files transferred: ([\d,]+)/im,
    'countOfDeleted': /number of deleted files: ([\d,]+)/im
  },
  'range': {
    'progressInSeconds':  {
      'minimum': 1.0,
      'maximum': Infinity
    }
  },
  'schedule': null,
  'startName': Package.name,
  'task': {
    'logLevel': 'debug',
    'logPath': `${Process.env.HOME}/Library/Logs/lotho/lotho-task.log`
  },
  'test': {
    'logLevel': 'trace',
    'logPath': `${Process.env.HOME}/Library/Logs/lotho/lotho-test.log`,
    'parameter': {
      'lotho': {},
      'pm2': {
        '--silent': true
      }
    },
    'path': {
      'lotho': 'distributable/lotho.js',
      'pm2': 'node_modules/pm2/bin/pm2'
    }
  }
}

const Configuration = Object.create(configurationPrototype)

Configuration.merge = function (value) { // = Configuration.path.configuration) {

  let configuration = null

  if (Is.string(value)) {
    configuration = Merge(require(value), { 'path': { 'configuration': value } })
  }
  else {
    configuration = value
  }

  Object.setPrototypeOf(Configuration, Merge(Object.getPrototypeOf(Configuration), configuration))

}

Configuration.clear = function () {
  Object.setPrototypeOf(Configuration, configurationPrototype)
}

Configuration.getParameter = function (parameter) {
  return Object.keys(parameter)
    .filter((name) => parameter[name])
    .map((name) => {

      let value = parameter[name]

      if (Is.function(value)) {
        return [ name, value() ]
      }
      else if (Is.string(value)) {
        return [ name, value ]
      }
      else {
        return name
      }

    })
    .flat()
}

export default Configuration
