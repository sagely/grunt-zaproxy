# grunt-zaproxy

> Grunt tasks for ZAProxy.

## Getting Started
This plugin requires Grunt `~0.4.2`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-zaproxy --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-zaproxy');
```

## The "zap_start" task
Start a ZAProxy instance and wait for it to initialize. Note that ZAProxy must be installed and zap.sh must be available on the executable path for this to work.

### Overview
In your project's Gruntfile, add a section named `zap_start` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  'zap_start': {
    options: {
      // Task-specific options go here.
    }
  },
});
```

### Options

#### options.host
Type: `String`

Default value: `'localhost'`

The host used for proxying.

#### options.port
Type: `Number`

Default value: `8080`

The port used for proxying.

#### options.daemon
Type: `Boolean`

Default value: `true`

Whether or not to run ZAProxy in daemon mode.

## The "zap_stop" task
Stop a running instance of ZAProxy.

### Overview
In your project's Gruntfile, add a section named `zap_stop` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  'zap_stop': {
    options: {
      // Task-specific options go here.
    }
  },
});
```

### Options

#### options.host
Type: `String`

Default value: `'localhost'`

The host where the proxy is running.

#### options.port
Type: `Number`

Default value: `8080`

The port where the proxy is running.

## The "zap_spider" task
Initiate a spider scan on a running instance of ZAProxy and wait for it to finish. This task is a multitask in order to allow for multiple scans.

### Overview
In your project's Gruntfile, add a section named `zap_spider` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  'zap_spider': {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific options go here.
    }
  },
});
```

### Options

#### options.url
Type: `String`

Required: `true`

The URL to scan.

#### options.host
Type: `String`

Default value: `'localhost'`

The host where the proxy is running.

#### options.port
Type: `Number`

Default value: `8080`

The port where the proxy is running.

## The "zap_scan" task
Initiate an active scan on a running instance of ZAProxy and wait for it to finish. This task is a multitask in order to allow for multiple scans.

### Overview
In your project's Gruntfile, add a section named `zap_scan` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  'zap_scan': {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific options go here.
    }
  },
});
```

### Options

#### options.url
Type: `String`

Required: `true`

The URL to scan.

#### options.host
Type: `String`

Default value: `'localhost'`

The host where the proxy is running.

#### options.port
Type: `Number`

Default value: `8080`

The port where the proxy is running.

## The "zap_alert" task
Check alerts from a running instance of ZAProxy. This tasks sets a flag named `zap_alert.failed` if alerts that are not in the ignore list are found. The `zap_stop` task looks for this flag and fails the run if it is found.

### Overview
In your project's Gruntfile, add a section named `zap_alert` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  'zap_alert': {
    options: {
      // Task-specific options go here.
    }
  },
});
```

### Options

#### options.host
Type: `String`

Default value: `'localhost'`

The host where the proxy is running.

#### options.port
Type: `Number`

Default value: `8080`

The port where the proxy is running.

#### options.ignore
Type: `Array`

Default value: `[]`

A list of alerts to ignore. For example, to ignore the alert about X-Content-Type-Options, set ignore to `[ 'X-Content-Type-Options header missing' ]`.

### Usage Examples
A typical ZAProxy run consists of the following steps:

1. Start ZAProxy.
2. "Teach" ZAProxy how to navigate your application, by navigating through it manually or running an automated test suite against the proxy server.
3. Execute an active scan.
4. (optional) Clean up the environment after scanning.
5. Check for alerts.
6. Shut down ZAProxy.

This can be accomplished using the set of tasks provided by this plugin along with some additional custom tasks defined in your own Gruntfile. For example, you could define an alias as follows:

```js
  grunt.registerTask('zap', [
    'zap_start',
    'acceptance_tests',
    'zap_spider',
    'zap_scan',
    'zap_alert',
    'zap_stop'
  ]);
```

Note that in order for this to work your acceptance test suite would have to be configured to access the target site via the proxy.

Once quirk to note about these tasks is that the `zap_alert` task does not actually fail Grunt if alerts are found. Instead, it sets a flag named `zap_alert.failed` in `grunt.config`. The `zap_stop` task then looks for this flag and fails Grunt if it finds it. This is so that the stop task will be run regardless of whether or not errors are found.

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
