/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@wimm/db", "@wimm/validators", "@wimm/types"],
};

module.exports = nextConfig;
