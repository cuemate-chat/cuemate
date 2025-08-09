module.exports = {
  hooks: {
    readPackage(pkg) {
      // 默认忽略 optionalDependencies，避免在主机安装原生模块（如 better-sqlite3）触发编译
      // 在容器/CI 内若需完整安装，请设置 INSTALL_FULL_OPTIONALS=true
      if (process.env.INSTALL_FULL_OPTIONALS === "true") return pkg;
      if (pkg.optionalDependencies) {
        pkg.optionalDependencies = {};
      }
      return pkg;
    },
  },
};
