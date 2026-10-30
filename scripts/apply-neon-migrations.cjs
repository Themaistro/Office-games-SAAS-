// Compatibility entry point: upgrades must never replay bootstrap schemas or seeds.
require('./migrate.cjs');
