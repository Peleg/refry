const path = require('path');

module.exports = {
  entry: [path.join(__dirname, 'src', 'index')],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'refry.js',
    library: 'refry',
    libraryTarget: 'commonjs2'
  },
  devtool: 'source-map',
  module: {
    loaders: [
      { test: /\.jsx?$/, loader: 'babel', exclude: /node_modules/ }
    ]
  },
  externals: {
    react: 'react'
  }
}
