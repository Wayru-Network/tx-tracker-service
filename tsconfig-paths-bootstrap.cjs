const tsConfig = require('./tsconfig.json');
const tsConfigPaths = require('tsconfig-paths');

// Map paths to dist directory for compiled code
const paths = {};
for (const [key, value] of Object.entries(tsConfig.compilerOptions.paths)) {
  paths[key] = value.map(path => path.replace('src/', 'dist/'));
}

tsConfigPaths.register({
  baseUrl: tsConfig.compilerOptions.baseUrl,
  paths: paths
}); 