module.exports = {
  webpack: {
    configure: (webpackConfig, { env }) => {
      // source-map-loader 규칙을 완전히 제거 (더 강력한 방법)
      webpackConfig.module.rules = webpackConfig.module.rules.filter(rule => {
        if (rule.use && Array.isArray(rule.use)) {
          return !rule.use.some(loader => 
            (loader.loader && loader.loader.includes('source-map-loader')) ||
            (typeof loader === 'string' && loader.includes('source-map-loader'))
          );
        }
        if (rule.use && typeof rule.use === 'string') {
          return !rule.use.includes('source-map-loader');
        }
        return true;
      });
      
      // devtool을 false로 설정하여 소스맵 생성 비활성화
      webpackConfig.devtool = false;
      
      // ignoreWarnings 추가로 소스맵 경고 무시
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /Module Warning \(from .*source-map-loader/,
        /source map/,
      ];

      // React Refresh Babel 플러그인을 프로덕션에서 비활성화
      if (env === 'production') {
        webpackConfig.module.rules.forEach(rule => {
          if (rule.use && Array.isArray(rule.use)) {
            rule.use.forEach(loader => {
              if (loader.loader && loader.loader.includes('babel-loader')) {
                if (!loader.options) loader.options = {};
                if (!loader.options.plugins) loader.options.plugins = [];
                loader.options.plugins = loader.options.plugins.filter(plugin => 
                  !(Array.isArray(plugin) && plugin[0] && plugin[0].includes('react-refresh'))
                );
              }
            });
          }
        });
      }
      
      return webpackConfig;
    }
  },
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      // setupMiddlewares를 사용하여 deprecated 경고 해결
      return middlewares;
    }
  }
};
