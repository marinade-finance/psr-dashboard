import path from 'path'
import webpack from 'webpack'
import type { Configuration } from 'webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin'
import CopyPlugin from 'copy-webpack-plugin'
import CompressionPlugin from 'compression-webpack-plugin'

const webpackConfig = (env: {
  production: boolean
  development: boolean
}): Configuration => ({
  entry: './src/index.tsx',
  ...(env.production || !env.development ? {} : { devtool: 'eval-source-map' }),
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.json' })],
    alias: {
      fs: false,
    },
  },
  output: {
    path: path.join(__dirname, '/build'),
    filename: '[name].[chunkhash].js',
    chunkFilename: '[name].[chunkhash].js',
    clean: true,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Heavy vendor libs that rarely change — cached between deploys
        vendor: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router|@remix-run)[\\/]/,
          name: 'vendor-react',
          chunks: 'all',
          priority: 20,
        },
        // SDK + data libs
        sdk: {
          test: /[\\/]node_modules[\\/](@marinade\.finance|decimal\.js|axios)[\\/]/,
          name: 'vendor-sdk',
          chunks: 'all',
          priority: 15,
        },
        // UI libs (radix, tailwind-merge, cva)
        ui: {
          test: /[\\/]node_modules[\\/](@radix-ui|@floating-ui|tailwind-merge|class-variance-authority|clsx)[\\/]/,
          name: 'vendor-ui',
          chunks: 'all',
          priority: 10,
        },
        // Everything else from node_modules
        common: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor-common',
          chunks: 'all',
          priority: 5,
          minSize: 10000,
        },
      },
    },
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
        exclude: /dist/,
      },
      {
        test: /\.module\.css$/i,
        use: [
          'style-loader',
          'css-modules-typescript-loader',
          {
            loader: 'css-loader',
            options: { modules: true },
          },
          'postcss-loader',
        ],
      },
      {
        test: /\.css$/i,
        exclude: /\.module\.css$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new CopyPlugin({
      patterns: [
        { from: 'public/docs', to: 'docs' },
        { from: 'public/_routes.json', to: '_routes.json' },
      ],
    }),
    new webpack.DefinePlugin({
      'process.env.PRODUCTION': env.production || !env.development,
      'process.env.NAME': JSON.stringify(require('./package.json').name),
      'process.env.VERSION': JSON.stringify(require('./package.json').version),
    }),
    new ForkTsCheckerWebpackPlugin({
      typescript: { configFile: './tsconfig.json' },
    }),
    // Gzip + Brotli compression for Cloudflare Pages
    ...(env.production || !env.development
      ? [
          new CompressionPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 8192,
            minRatio: 0.8,
          }),
        ]
      : []),
  ],
})

export default webpackConfig
