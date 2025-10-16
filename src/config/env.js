const dotenv = require("dotenv");

let envLoaded = false;

const loadEnv = () => {
  if (envLoaded) {
    return;
  }

  const result = dotenv.config();

  if (result.error && result.error.code !== "ENOENT") {
    throw result.error;
  }

  envLoaded = true;
};

loadEnv();

module.exports = {
  loadEnv,
};
