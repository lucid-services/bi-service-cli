
### Integration

```javascript

var Service = require('bi-service').Service;

//your service definition
module.exports = new Service;

//hookup the plugin to the bi-service
require('bi-service-cli');
```

Require the plugin module preferably at the bottom of your index.js file of your project (aka. where your Service definition should be)

### bi-service project config

Add the cli app

```json
{
    listen: {
        cli: {
            port: '3000'
        }
    },
    apps: {
        cli: {
            baseUrl: {$join: [
                'http://127.0.0.1:',
                {$ref: '#listen/cli/port'}
            ]},
            listen: {$ref: '#listen/cli/port'},
            show: false //if true - attaches REPL node console to the service process
        }
    }
}
```

### Using the console

After you are connected to the console. The `help` command is your friend.  
Use it to get an overview of available commands and their usage 
