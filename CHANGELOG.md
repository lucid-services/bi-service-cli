# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) 
and this project adheres to [Semantic Versioning](http://semver.org/).

## v1.3.3

* [FIXED] - CLI app initialization should be postponed to the point where all apps are synchronously prepared for startup

## v1.3.2

* [FIXED] - `integrity` cli cmd and `/api/v1.0/integrity` http endpoint (were using stale interface of bi-service@<0.15.x)

## v1.3.1

* [FIXED] - default `cli` config location should be `apps:cli` instead of `cli`

## v1.3.0

* [REMOVED] - `bi-config` dependecy
* [CHANGED] - use `bi-service@>=0.15.x` API

## v1.2.0

* [CHANGED] - use `bi-service@>0.13.x` API
* [ADDED] - `sdkMethod` column to `ls -r` list of routes
* [ADDED] - success response data schema to `inspect route <uid>` cmd output
* [ADDED] - `ls -r <uid>` alias for `inspect route <uid>`

## v1.1.0

* [ADDED] - http API

## v1.0.10

## v1.0.9

* [FIXED] - since `bi-service@0.10.x` the `AppManager` is responsible for registering a new App in its registry

## v1.0.8

* [FIXED] - `inspect route` cmd json printing options

## v1.0.7

* [FIXED] - `ls` command - don't fail when a server is not running
* [FIXED] - use `bi-json-inspector@0.3x`

## v1.0.6

* [FIXED] - list missing `easy-table` dependency

## v1.0.5

* [FIXED] - list missing dependencies (`bi-json-inspector` & `bi-json-stringifier`)

## v1.0.4

* [FIXED] - invalid module require path

## v1.0.3

* [FIXED] - make plugin from this module
* [CHANGED] - renamed the module name from `bi-cli` to `bi-service-cli`

## v1.0.2

* [FIXED] - the CLI app should stick to common `bi-service` App interface

## v1.0.1
