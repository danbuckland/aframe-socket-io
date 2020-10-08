const path = require('path');

module.exports = {
  mode: 'none',
  entry: './source/app.js',
  output: {
    path: path.join(__dirname, 'public'),
    publicPath: '/',
    filename: 'bundle.js'
  },
  module: {
    rules: [{
      loader: 'babel-loader',
      test: /\.mjs$/,
      exclude: [
        /node_modules/
      ]
    }, {
      test: /\.css$/,
      exclude: [
        /node_modules/
      ],
      use: ['style-loader', 'css-loader'],
    }]
  },
  devtool: 'cheap-module-eval-source-map'
};