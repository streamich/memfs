const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const root = require('app-root-path');

const DEV = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: DEV ? 'development' : 'production',
  devtool: DEV ? 'source-map' : false,
  entry: {
    bundle: __dirname + '/index',
  },
  plugins: [
    // new ForkTsCheckerWebpackPlugin(),
    new HtmlWebpackPlugin({
      title: 'Development',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      assert: require.resolve('assert'),
      buffer: require.resolve('buffer'),
      path: require.resolve('path-browserify'),
      process: require.resolve('process/browser'),
      stream: require.resolve('readable-stream'),
      // url: require.resolve('url'),
    },
  },
  output: {
    filename: '[name].js',
    path: path.resolve(root.path, 'dist'),
  },
  devServer: {
    // HTTPS is required for SharedArrayBuffer to work.
    https: true,
    headers: {
      // These two headers are required for SharedArrayBuffer to work.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    port: 9876,
    hot: false,
  },
};
