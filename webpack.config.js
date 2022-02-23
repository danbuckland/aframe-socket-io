const path = require('path');

module.exports = (env) => {
  const isProduction = env === 'production';

  return {
    mode: 'none',
    entry: __dirname + '/source/app.js',
    output: {
      path: path.join(__dirname, 'public', 'dist'),
      publicPath: '/dist/',
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
    devtool: isProduction ? 'source-map' : 'cheap-module-eval-source-map'
  }
};