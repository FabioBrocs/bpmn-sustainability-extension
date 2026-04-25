const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: {
      name: 'BpmnSustainabilityExtension',
      type: 'umd',
    },
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  externals: [
    function ({ request }, callback) {
      if (/^(bpmn-js|@bpmn-io|bpmn-js-properties-panel|preact|htm)(\/.*)?$/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    }
  ]
};