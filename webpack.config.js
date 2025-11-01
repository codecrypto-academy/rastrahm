const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: {
    background: './src/background/background.ts',
    content: './src/content/content.ts',
    inpage: './src/inpage/inpage.ts',
    popup: './src/popup/popup.tsx',
    connect: './src/connect/connect.tsx',
    notification: './src/notification/notification.tsx',
    test: './src/test/test.tsx',
    confirm: './src/confirm/confirm.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer/"),
      "crypto": require.resolve("crypto-browserify"),
      "assert": require.resolve("assert/"),
      "process": require.resolve("process/browser"),
      "url": require.resolve("url/"),
      "util": require.resolve("util/"),
      "fs": false,
      "path": require.resolve("path-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "vm": require.resolve("vm-browserify")
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env),
      'process.browser': JSON.stringify(true),
      'process.version': JSON.stringify(process.version)
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    }),
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new HtmlWebpackPlugin({
      template: './src/connect/connect.html',
      filename: 'connect.html',
      chunks: ['connect']
    }),
    new HtmlWebpackPlugin({
      template: './src/notification/notification.html',
      filename: 'notification.html',
      chunks: ['notification']
    }),
    new HtmlWebpackPlugin({
      template: './src/test/test.html',
      filename: 'test.html',
      chunks: ['test']
    }),
    new HtmlWebpackPlugin({
      template: './src/confirm/confirm.html',
      filename: 'confirm.html',
      chunks: ['confirm']
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'icons', to: 'icons' },
        { from: 'manifest.json', to: 'manifest.json' }
      ]
    })
  ],
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  }
};
