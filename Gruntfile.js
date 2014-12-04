'use strict';

module.exports = function(grunt) {

    var mountFolder = function(connect, dir) {
        return connect.static(require('path').resolve(dir));
    };

    var path = require('path');

    grunt.initConfig({
        execute: {
            nodeapp: {
                target: {
                    src: ['examples/nodeapp/main.js']
                }
            },
            json2lcov: {
                options: {
                    // json src , output .lcov src
                    args: ['./target/coverage/coverage.json', './target/coverage/coverage.lcov']
                },
                src: ['./jsoncov2lcov.js']
            }
        },
        exec: {},
        open: {
            webapp: {
                path: 'http://localhost:9000',
                app: 'google-chrome'
            },
            test: {
                path: 'http://localhost:8000',
                app: 'google-chrome'
            }
        },
        connect: {
            webserver: {
                options: {
                    port: 9000,
                    hostname: '0.0.0.0',
                    middleware: function(connect) {
                        return [
                            mountFolder(connect, 'examples/webapp/'),
                            mountFolder(connect, 'src/'),
                            mountFolder(connect, 'bower_components/')
                        ];
                    },
                    livereload: 35729
                }
            },
            'test_webserver': {
                options: {
                    port: 8000,
                    hostname: '0.0.0.0',
                    middleware: function(connect) {
                        return [
                            mountFolder(connect, 'test/browser/'),
                            mountFolder(connect, 'src/'),
                            mountFolder(connect, 'bower_components/'),
                            mountFolder(connect, 'target/coverage')
                        ];
                    }
                }

            }
        },
        watch: {
            options: {
                task: ['']
            },
            webapp: {
                files: [
                    'examples/webapp/**/*',
                    'src/**/*'
                ],
                // tasks: ['jshint'],
                options: {
                    livereload: 35729
                }
            },
            nodeapp: {
                files: [
                    'examples/nodeapp/**'
                ]
            },
            test: {
                files: [
                    'test/browser/**'
                ]
            }
        },
        express: {
            load: {
                options: {
                    port: 3000,
                    server: path.resolve('./examples/express/express')
                }
            }
        },
        cover: {
            compile: {
                files: {
                    'target/coverage/instrumented_src/*.js': ['src/**/*.js']
                }
            }
        },
        coveralls: {
            options: {
                // LCOV coverage file relevant to every target
                src: 'target/coverage/lcov.info',
                // When true, grunt-coveralls will only print a warning rather than
                // an error, to prevent CI builds from failing unnecessarily (e.g. if
                // coveralls.io is down). Optional, defaults to false.
                force: true
            }
        },
        mochaTest: { //test for nodejs app with mocha
            tap: {
                options: {
                    reporter: 'tap',
                    captureFile: 'target/node/test_results.dirty.tap', // Optionally capture the reporter output to a file
                    quiet: false, // Optionally suppress output to standard out (defaults to false)
                    clearRequireCache: false // Optionally clear the require cache before running tests (defaults to false)
                },
                src: ['test/node/**/*.js']
            },
            // coverage: {
            //     options: {
            //         reporter: ,
            //         captureFile:
            //     },
            //     src: ['test']
            // },
            noreporter: {
                src: ['test/node/**/*.js']
            }
        }, //test for browser app with mocha and phanthom
        'mocha_phantomjs': {
            options: {
                urls: [
                    'http://localhost:8000' /*<%= connect.options.port %>*/
                ],
                setting: [
                    'webSecurityEnabled=false',
                    'remote-debugger-autorun=true',
                    'remote-debugger-port=9002',
                    'ignore-ssl-errors=true'
                ]
            },
            noreporter: {

            },
            tap: {
                options: {
                    reporter: 'tap',
                    output: 'target/browser/test_results.dirty.tap'
                }
            },
            coverage: {
                options: {
                    urls: [
                        'http://localhost:8000/index-cover.html' /*<%= connect.options.port %>*/
                    ],
                    reporter: 'json-cov',
                    output: 'target/coverage/coverage.json'
                }
            }
        },
        lineremover: {
            tap: {
                options: {
                    inclusionPattern: /^(((not )?ok \d)|# \w+ \d|\d..\d).*$/gm
                },
                files: [{
                    expand: true,
                    cwd: 'target',
                    src: [
                        '**/*.dirty.tap'
                    ],
                    dest: 'target/',
                    ext: '.tap'
                }]
            }
        }
    });

    grunt.loadNpmTasks('grunt-open');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-execute');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-express');
    grunt.loadNpmTasks('grunt-mocha-phantomjs');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-line-remover');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-coverjs');
    grunt.loadNpmTasks('grunt-coveralls');


    grunt.registerTask('server:webapp', [
        'express:load',
        'execute:nodeapp',
        'connect:webserver',
        'open:webapp',
        'watch:webapp'
    ]);

    grunt.registerTask('server:nodeapp', [
        'express:load',
        'execute:nodeapp',
        'watch:nodeapp'
    ]);

    grunt.registerTask('test:browser', [
        'express:load',
        'connect:test_webserver',
        'mocha_phantomjs:tap',
        'lineremover:tap'
    ]);

    grunt.registerTask('test:node', [
        'express:load',
        'mochaTest:tap',
        'lineremover:tap'
    ]);


    grunt.registerTask('test:tap', [
        'express:load',
        'connect:test_webserver',
        'mocha_phantomjs:noreporter',
        'mochaTest:noreporter',
        'lineremover:tap'
    ]);

    grunt.registerTask('test', [
        'test:browser',
        'test:node'
    ]);

    grunt.registerTask('test:coverage', [
        'cover',
        'express:load',
        'connect:test_webserver',
        'mocha_phantomjs:coverage',
        'execute:json2lcov'

    ]);

    grunt.registerTask('server:test', [
        'test:browser',
        'open:test',
        'watch:test'
    ]);

    grunt.registerTask('build', [
        'test',
        'test:coverage'
    ]);

};