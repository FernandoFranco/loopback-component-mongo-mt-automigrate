function migrateModel(config, Model, migrated) {
  return new Promise((resolve, reject) => {
    config.dataSource.connector[config.method](Model.name, {
      accessToken: config.accessToken,
    }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  })
    .then(() => {
      const migration = {
        tenant: config.accessToken.tenant,
        model: Model.name,
        version: Model.definition.settings.version,
        date: new Date(),
      };

      if (migrated) migrated.updateAttributes(migration);
      else config.Automigrate.create(migration);
    });
}

function loadMigrateds(Automigrate, tenant) {
  return new Promise((resolve, reject) => {
    Automigrate.find({ where: { tenant } }, (err, migrateds) => {
      if (err) reject(err);
      else resolve(migrateds);
    });
  });
}

function migrateTenant(config) {
  loadMigrateds(config.Automigrate, config.accessToken.tenant)
    .then((migrateds = []) => {
      config.models.forEach((Model) => {
        const migrated = migrateds.find((m) => m.model === Model.name);
        if (!migrated || migrated.version < Model.definition.settings.version) {
          migrateModel(config, Model, migrated);
        }
      });
    });
}

function startAutoMigrationComponent(app, config) {
  // Migrate: A la carte
  app.middleware('routes:before', (req, _, next) => {
    if (req.accessToken && req.accessToken.tenant) {
      migrateTenant(Object.assign(config, { accessToken: req.accessToken }));
    }
    next();
  });

  // Migrate: Default
  migrateTenant(Object.assign({}, config, {
    models: [config.Automigrate],
    accessToken: { tenant: '' },
  }));
}

module.exports = function autoMigrateComponent(app, { method, dataSource, models }) {
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

  startAutoMigrationComponent(app, {
    dataSource: app.dataSources[dataSource],
    Automigrate: app.models.Automigrate,
    models: models.map(model => app.models[model]),
    method,
  });
}
