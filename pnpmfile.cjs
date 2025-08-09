
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (process.env.INSTALL_FULL_OPTIONALS === 'true') return pkg;
      if (pkg.optionalDependencies) pkg.optionalDependencies = {};
      return pkg;
    },
  },
};
