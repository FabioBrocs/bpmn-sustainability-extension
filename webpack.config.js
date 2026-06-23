const path = require('path');

// 1. WEB CONFIG
const webConfig = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: { name: 'BpmnSustainabilityExtension', type: 'umd' },
    globalObject: 'this'
  },
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, use: { loader: 'babel-loader', options: { presets: ['@babel/preset-env'] } } },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ]
  },
  externals: [
    /^bpmn-js(\/.*)?$/,
    /^@bpmn-io(\/.*)?$/,
    /^bpmn-js-properties-panel(\/.*)?$/,
    /^preact(\/.*)?$/,
    /^htm(\/.*)?$/
  ]
};

// 2. DESKTOP CONFIG
const desktopConfig = {
  entry: './desktop-plugin/client.js',
  output: {
    path: path.resolve(__dirname, 'dist-desktop'),
    filename: 'client.js'
  },
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, use: { loader: 'babel-loader', options: { presets: ['@babel/preset-env'] } } },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ]
  },
  resolve: {
    alias: {
      'preact': 'camunda-modeler-plugin-helpers/vendor/@bpmn-io/properties-panel/preact',
      'preact/hooks': 'camunda-modeler-plugin-helpers/vendor/@bpmn-io/properties-panel/preact/hooks',
      '@bpmn-io/properties-panel': 'camunda-modeler-plugin-helpers/vendor/@bpmn-io/properties-panel',
      'bpmn-js-properties-panel': 'camunda-modeler-plugin-helpers/vendor/bpmn-js-properties-panel'
    }
  }
};

module.exports = [webConfig, desktopConfig];