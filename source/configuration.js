import { Duration, DateTime } from 'luxon'
import Is from '@pwn/is'
import Merge from 'deepmerge'
import OS from 'os'
import { FileSystem, Path } from '@virtualpatterns/mablung'

const [ COMPUTER_NAME ] = OS.hostname().match(/^[^.]+/)
const HOME_PATH = OS.homedir()
const MILLISECONDS_PER_SECOND = 1000
const NANOSECONDS_PER_SECOND = 1000000000

const configurationPrototype = {
  'archive': [],
  'conversion': {
    'toDuration': ([ seconds, nanoseconds ]) => Duration.fromMillis((seconds + nanoseconds / NANOSECONDS_PER_SECOND) * MILLISECONDS_PER_SECOND),
    'toSeconds': ([ seconds, nanoseconds ]) => (seconds + nanoseconds / NANOSECONDS_PER_SECOND).toFixed(2)
  },
  'default': {
    'archive': [
      {
        'name': COMPUTER_NAME,
        'path': {
          'source': [ 
            Path.join(HOME_PATH, '.lotho')
          ],
          'target': `BUCKBEAK.local:/Volumes/BUCKBEAK1/Backup/${COMPUTER_NAME}`,
          'include': [],
          'exclude': [
            '.DS_Store',
            '*.lock',
            '*.log'
          ]
        },
        'schedule': '0 0 */1 * * *'
      }
    ],
    'option': {
      'rsync': { 
        'cwd': '/usr/local/bin'
      }
    },
    'parameter': {
      'rsync': {}
    },
    'path': {
      'rsync': '/usr/local/bin/rsync',
      'privateKey': Path.join(HOME_PATH, '.ssh', 'id_rsa')
    }
  },
  'format': {
    'shortDuration': 'hh\'h\' mm\'m\' ss.SSS\'s\'',
    'longDuration': 'yy\'y\' MM\'mo\' dd\'d\' hh\'h\' mm\'m\' ss.SSS\'s\'',
    'schedule': '\'on\' DDDD \'at\' tt',
    'stamp': 'yyyy.LL.dd-HH.mm.ss.SSSZZZ'
  },
  'line': '-'.repeat(80),
  'logLevel': 'debug',
  'logPath': 'console',
  'name': {
    'computer': COMPUTER_NAME,
    'content': 'current'
  },
  'now': () => DateTime.local(),
  'option': {
    'rsync': {},
    'start': {}
  },
  'parameter': {
    'rsync': {},
    'start': {}
  },
  'path': {
    'configuration': Path.join(HOME_PATH, '.lotho', 'configuration.json'),
    'home': Path.join(HOME_PATH, '.lotho'),
    'privateKey': Path.join(HOME_PATH, '.ssh', 'id_rsa'),
    'rsync': '/usr/local/bin/rsync',
    'start': Path.normalize(Path.join(__dirname, 'lotho.js'))
  },
  'pattern': {
    'backwardSlash': /\\/g,
    'forwardSlash': /\//g,
    'change': /^([<>ch\\.\\*]\S+)\s+(.*)$/,
    'countOfScanned': /number of files: ([\d,]+)/im,
    'countOfCreated': /number of created files: ([\d,]+)/im,
    'countOfUpdated': /number of regular files transferred: ([\d,]+)/im,
    'countOfDeleted': /number of deleted files: ([\d,]+)/im,
    'remotePath': /^(.*):(.*)$/
  },
  'range': {
    'progressInSeconds':  {
      'minimum': 1.0,
      'maximum': Infinity
    }
  },
  'task': {
    'logLevel': 'debug',
    'logPath': Path.join(HOME_PATH, 'Library', 'Logs', 'lotho', 'lotho-task.log')
  },
  'test': {
    'logLevel': 'trace',
    'logPath': Path.join(HOME_PATH, 'Library', 'Logs', 'lotho', 'lotho-test.log'),
    'option': {
      'lotho': { 
        'silent': true 
      }
    },
    'parameter': {
      'lotho': {}
    },
    'path': {
      'lotho': Path.join('distributable', 'lotho.js')
    }
  }
}

const Configuration = Object.create(configurationPrototype)

Configuration.merge = function (value) {

  let configuration = null

  if (Is.string(value)) {
    configuration = Merge(FileSystem.readJsonSync(value, { 'encoding': 'utf-8' }), { 'path': { 'configuration': value } })
  }
  else {
    configuration = value
  }

  Object.setPrototypeOf(Configuration, Merge(Object.getPrototypeOf(Configuration), configuration))

}

Configuration.clear = function () {
  Object.setPrototypeOf(Configuration, configurationPrototype)
}

Configuration.getParameter = function (...parameter) {

  parameter = parameter.reduce((accumulator, parameter) => Merge(accumulator, parameter), {})

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

Configuration.getOption = function (...option) {
  return option.reduce((accumulator, option) => Merge(accumulator, option), {})
}

export default Configuration
