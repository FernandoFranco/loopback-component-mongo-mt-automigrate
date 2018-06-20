# loopback-component-mongodb-mt-automigrate
Auto migrate with mongodb-mt connector

## Instalation
Rum the command  
`npm install loopback-component-mongodb-mt-automigrate`
or
´yarn add loopback-component-mongodb-mt-automigrate´

## Component configurations
Required configurations to using this component

### middleware.json
Need the loopback#token middleware in `./server/middleware.json`:
```json
{
  "routes:before": {
    "loopback#token": {
      "params": {
        "model": "MyAccessTokenModel"
      }
    }
  }
}
```
### model-config.json
Add Models in `./server/model-config.json`
```json
{
  "_meta": {
    "sources": [
      "../nodemodules/loopback-component-mongodb-mt-automigrat/models"
    ]
  },
  "Automigrate": {
    "dataSource": "db",
    "public": false
  }
}
```
### component-config.json
Add `loopback-component-mongodb-mt-automigrate` in `./server/component-config.json`
```json
{
  "./component/automigration": {
    "method": "autoupdate",
    "dataSource": "db",
    "models": [
      "MyModel",
    ]
  }
}
```
  * [method]: The method to automigration using:
     * `autoupdate`: Update the model indexes without change the database data.
     * `automigrate`: Migrate the model with cleaning the database data.
  * [dataSource]: The data source to using in the migration.
  * [models]: Models to migrate.

## Models configurations
Use in yours models the `version` and `indexes` attributes like this:
```json
{
  "name": "MyModel",
  "base": "PersistedModel",
  "idInjection": true,
  "options": {
    "validateUpsert": true
  },
  "indexes": {
    "idx_foo": {
      "keys": {
        "foo": 1
      }
    },
  },
  "options": {
    "validateUpsert": true
  },
  "version": 1,
  "properties": {
    "foo": {
      "type": "string",
      "required": true
    },
    "bar": {
      "type": "boolean",
      "default": true
    }
  },
  "validations": [],
  "relations": {},
  "acls": [],
  "methods": {}
}
```
