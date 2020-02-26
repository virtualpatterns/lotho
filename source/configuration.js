import { Duration, DateTime } from 'luxon'
import Is from '@pwn/is'
import Merge from 'deepmerge'
import Omit from 'object.omit'
import OS from 'os'
import { FileSystem, Path, Process } from '@virtualpatterns/mablung'
import Redact from 'fast-redact'

const [ COMPUTER_NAME ] = OS.hostname().match(/^[^.]+/)
const HOME_PATH = OS.homedir()
const PORT = 4567

const MILLISECOND_PER_SECOND = 1000
const NANOSECOND_PER_SECOND = 1000000000

const configurationPrototype = {
  'archive': [],
  'conversion': {
    'toDuration': ([ second, nanosecond ]) => Duration.fromMillis((second + nanosecond / NANOSECOND_PER_SECOND) * MILLISECOND_PER_SECOND)
  },
  'default': {
    'archive': [
      {
        'name': COMPUTER_NAME,
        'path': {
          'home': Path.join(HOME_PATH, '.lotho'),
          'source': [ 
            Path.join(HOME_PATH, '.lotho', 'configuration.json')
          ],
          'target': `BUCKBEAK.local:/Volumes/BUCKBEAK1/Backup/${COMPUTER_NAME}`,
          'include': [],
          'exclude': [
            '.DS_Store'
          ]
        },
        'schedule': '0 0 */1 * * *',
        'server': {
          'address': '0.0.0.0',
          'port': PORT
        }
      }
    ],
    'option': {
      'rsync': {},
      'SNS': {
        'service': {
          'credentials': {
            'accessKeyId': 'ABC',
            'secretAccessKey': 'DEF'
          }
        }
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
    'byte': {
      'scale': 'binary',
      'unit': 'B'
    },
    'duration': 'hh\'h\' mm\'m\' ss.SSSS\'s\'',
    'schedule': 'DDD \'at\' t',
    'stamp': 'yyyy.LL.dd-HH.mm.ss.SSSZZZ'
  },
  'isPublished': true,
  'line': '-'.repeat(80),
  'logLevel': 'debug',
  'logPath': 'console',
  'name': {
    'computer': COMPUTER_NAME,
    'content': 'current'
  },
  'now': () => DateTime.local(),
  'option': {
    'CORS': {
      'preflightMaxAge': 5,
      'origins': [ '*' ],
      'allowHeaders': [ 'X-Forwarded-For' ],
      'exposeHeaders': [ '' ]
    },
    'omit': [
      'Message'
    ],
    'redact': {
      'paths': [
        'credentials.accessKeyId', 
        'credentials.secretAccessKey',
        'privateKey' 
      ],
      'censor': '**********'
    },
    'rsync': { 
      'cwd': Process.cwd(),
    },
    'SFTP': {},
    'SNS': {
      'service': {
        'region': 'us-east-1'
      },
      'message': {
        'TopicArn': 'arn:aws:sns:us-east-1:118971425490:lotho'
      }
    },
    'start': {
      'combine_logs': true,
      'max_restarts': 5,
      'restart_delay': 5000
    }
  },
  'parameter': {
    'rsync': {
      // --archive is equivalent to -rlptgoD ... removing -l (symlinks) -D (devices)
      '--delete': true,
      '--delete-excluded': true,
      '--executability': true,
      // '--extended-attributes': true,
      '--group': true,
      '--itemize-changes': true,
      '--owner': true,
      '--perms': true,
      '--recursive': true,
      '--relative': true,
      '--rsh': 'ssh',
      '--stats': true,
      '--times': true,
      '--whole-file': true
    },
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
    'whitespace': /\s/,
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
    'progressAsSecond': {
      'minimum': 5.0,
      'maximum': Infinity
    }
  },
  // 'schema': {
  //   'archive': {
  //     'title': 'Archive',
  //     'type': 'object',
  //     'properties': {
  //       'name': { 'type': 'string' },
  //       'path': {
  //         'name': 'Archive-Path',
  //         'type': 'object',
  //         'properties': {
  //           'home': { 'type': 'string' },
  //           'source': {
  //             'type': 'array',
  //             'items': { 'type': 'string' },
  //             'uniqueItems': false
  //           },
  //           'target':  { 'type': 'string' },
  //           'include':  {
  //             'type': 'array',
  //             'items': { 'type': 'string' },
  //             'uniqueItems': false
  //           },
  //           'exclude':  {
  //             'type': 'array',
  //             'items': { 'type': 'string' },
  //             'uniqueItems': false
  //           }
  //         },
  //         'required': [ 'home', 'source', 'target', 'include', 'exclude' ],
  //         'additionalProperties': false
  //       },
  //       'schedule': { 'type': 'string' }
  //     }
  //   }  
  // },
  'server': {
    'address': '0.0.0.0',
    'port': PORT
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
        'cwd': Process.cwd(),
        'execArgv': Process.execArgv.map((argument) => {

          let pattern = /--inspect-brk=(\d+)/i
          let match = null
        
          let port = null
        
          if (Is.not.null(match = pattern.exec(argument))) {
        
            let [ , portAsString ] = match
            port = parseInt(portAsString)
        
            return `--inspect=${port + 1}`

          }
          else {
            return argument
          }

        }),
        'silent': true
      },
      'request': {}
    },
    'parameter': {
      'lotho': {
        '--log-level': 'trace',
        '--log-path': Path.join(HOME_PATH, 'Library', 'Logs', 'lotho', 'lotho-test.log')
      }
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

  parameter = parameter.reduce((accumulator, parameter) => Merge(accumulator, this.toParameter(parameter)), {})

  return Object.keys(parameter)
    .filter((name) => parameter[name])
    .map((name) => Is.string(parameter[name]) ? [ name, parameter[name] ] : name)
    .flat()
    
}

Configuration.toParameter = function (parameter) {

  return Is.array(parameter) ? parameter.reduce((accumulator, parameter) => { 
    accumulator[parameter] = true 
    return accumulator
  }, {}) : parameter
  
}

Configuration.getOption = function (...option) {
  return option.reduce((accumulator, option) => Merge(accumulator, option), {})
}

Configuration.redact = function (value) {
  return JSON.parse(Redact(Configuration.option.redact)(value))
}

Configuration.omit = function (value) {
  return Omit(value, Configuration.option.omit)
}

export default Configuration
