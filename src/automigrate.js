'use strict';

const findMigrations = Automigrate => new Promise((resolve, reject) => {
  Automigrate.find({}, (err, migrations) => {
    if (err) reject(err);
    else resolve(migrations);
  });
});

const loadMigrateds = (Automigrate) => {
  return findMigrations(Automigrate)
    .then(migrations => migrations.reduce((migrated, {tenant, model, version}) => {
      if (!migrated[tenant]) migrated[tenant] = {};
      migrated[tenant][model] = version;
      return migrated;
    }, {'': {}}));
};

const migrate = (Automigrate, method, dataSource, migration, accessToken) =>
  new Promise((resolve, reject) => {
    dataSource.connector[method](migration.model, {accessToken}, (err) => {
      if (err) reject(err);
      else {
        Automigrate.findOne({where: {
          tenant: migration.tenant,
          model: migration.model,
        }}, (err2, result) => {
          if (err2) reject(err2);
          else {
            migration.date = new Date();
            if (!result) {
              Automigrate.create(migration, (err3) => {
                if (err3) reject(err3);
                else resolve(migration);
              });
            } else {
              result.updateAttributes(migration, (err4) => {
                if (err4) reject(err4);
                else resolve(migration);
              });
            }
          }
        });
      }
    });
  });

const migrateAll = (Automigrate, method, dataSource, Models, migrated,
  tenant = '', accessToken = {}) => {
  if (!migrated[tenant]) migrated[tenant] = {};

  const migrations = [];
  Models.forEach((Model) => {
    const model = Model.name;
    const version = Model.definition.settings.version;
    if (!migrated[tenant][model] || migrated[tenant][model] < version) {
      const migration = {tenant, model, version};
      migrations.push(migrate(Automigrate, method, dataSource, migration, accessToken));
    }
  });

  return Promise.all(migrations)
    .then((migrations = []) => {
      migrations.forEach((migration) => {
        if (!migrated[migration.tenant]) migrated[migration.tenant] = {};
        migrated[migration.tenant][migration.model] = migration.version;
      });
      return migrated;
    });
};

const tenantMiddleware = (Automigrate, method, dataSource, Models, migrated) => (req, res, next) => {
  if (req.accessToken && req.accessToken.tenant) {
    migrateAll(Automigrate, method, dataSource, Models, migrated, req.accessToken.tenant,
      req.accessToken);
  }
  next();
};

module.exports = (app, {method, dataSource, models}) => {
  const methods = ['autoupdate', 'automigrate'];

  if (typeof method !== 'string') throw new Error('Requies string in automigrate.method');
  if (!methods.some(m => m === method)) throw new Error('Invalid automigrate.method');
  if (typeof dataSource !== 'string') throw new Error('Requires string in automigrate.datasource');
  if (!app.dataSources[dataSource]) throw new Error(`Datasource ${dataSource} not found`);
  if (!Array.isArray(models)) throw new Error('Requies Array in automigrate.models');

  if (!Object.keys(app.models).some(model => model === 'Automigrate')) {
    throw new Error('Model Automigrate not found');
  }

  models.forEach((model, i) => {
    if (typeof model !== 'string') throw new Error(`Requires string in automigrate.models[${i}]`);
    if (!app.models[model]) throw new Error(`Model ${model} not found`);
  });

  const mDataSource = app.dataSources[dataSource];
  const mModels = models.map(model => app.models[model]);
  const Automigrate = app.models.Automigrate;

  loadMigrateds(Automigrate, mDataSource, mModels)
    .then(migrated => migrateAll(Automigrate, method, mDataSource, mModels, migrated))
    .then((migrated) => {
      const middleware = tenantMiddleware(Automigrate, method, mDataSource, mModels, migrated);
      app.middleware('routes:before', middleware);
    })
    .catch(console.error);
};
