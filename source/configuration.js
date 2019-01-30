import { Duration, DateTime } from 'luxon'
import Is from '@pwn/is'
import Merge from 'deepmerge'
import OS from 'os'
import { FileSystem, Path, Process } from '@virtualpatterns/mablung'

const [ COMPUTER_NAME ] = OS.hostname().match(/^[^.]+/)
const MILLISECONDS_PER_SECOND = 1000
const NANOSECONDS_PER_SECOND = 1000000000

const configurationPrototype = {
  'archive': [],
  'conversion': {
    'toDuration': ([ seconds, nanoseconds ]) => Duration.fromMillis((seconds + nanoseconds / NANOSECONDS_PER_SECOND) * MILLISECONDS_PER_SECOND),
    'toParameter': (parameter) => {

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
        
    },
    'toSeconds': ([ seconds, nanoseconds ]) => (seconds + nanoseconds / NANOSECONDS_PER_SECOND).toFixed(2)
  },
  'default': {
    'archive': [
      {
        'name': 'COMPUTER_NAME',
        'path': {
          'source': [ 
            Path.join(Process.env.HOME, '.lotho')
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
    'logLevel': 'debug',
    'logPath': Path.join(Process.env.HOME, '.lotho', 'lotho.log'),
    'path': {
      'rsync': '/usr/local/bin/rsync',
      'privateKey': Path.join(Process.env.HOME, '.ssh', 'id_rsa')
    }
  },
  'format': {
    'shortDuration': 'hh\'h\' mm\'m\' ss.SSS\'s\'',
    'longDuration': 'yy\'y\' MM\'mo\' dd\'d\' hh\'h\' mm\'m\' ss.SSS\'s\'',
    'schedule': '\'on\' DDDD \'at\' tt',
    'stamp': 'yyyy.LL.dd HH.mm.ss.SSSZZZ'
  },
  'line': '-'.repeat(80),
  'logLevel': 'debug',
  'logPath': Path.join(Process.env.HOME, 'Library', 'Logs', 'lotho', 'lotho.log'),
  'name': {
    'computer': COMPUTER_NAME,
    'content': 'current'
  },
  'now': () => DateTime.local(),
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
    },
    'start': {}
  },
  'path': {
    'configuration': Path.join(Process.env.HOME, '.lotho', 'configuration.json'),
    'home': Path.join(Process.env.HOME, '.lotho'),
    'privateKey': Path.join(Process.env.HOME, '.ssh', 'id_rsa'),
    'rsync': '/usr/local/bin/rsync',
    'start': Path.normalize(Path.join(__dirname, 'lotho.js'))
  },
  'pattern': {
    'change': /^([<>ch\\.\\*]\S+)\s+(.*)$/,
    'countOfScanned': /number of files: ([\d,]+)/im,
    'countOfCreated': /number of created files: ([\d,]+)/im,
    'countOfUpdated': /number of regular files transferred: ([\d,]+)/im,
    'countOfDeleted': /number of deleted files: ([\d,]+)/im,
    'remotePath': /^(.*):(.*)$/, // buckbeak.local:/Volumes/BUCKBEAK1/Backup/PODMORE
    'stamp': /^(.*) to (.*)$/
  },
  'range': {
    'progressInSeconds':  {
      'minimum': 1.0,
      'maximum': Infinity
    }
  },
  'task': {
    'logLevel': 'debug',
    'logPath': Path.join(Process.env.HOME, 'Library', 'Logs', 'lotho', 'lotho-task.log')
  },
  'test': {
    'logLevel': 'debug',
    'logPath': Path.join(Process.env.HOME, 'Library', 'Logs', 'lotho', 'lotho-test.log'),
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

export default Configuration
