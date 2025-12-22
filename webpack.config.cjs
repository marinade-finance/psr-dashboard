require('ts-node').register({
  transpileOnly: true,
  project: './tsconfig.json',
})
module.exports = require('./webpack.config.ts').default
