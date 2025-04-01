/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://www.xrayatlas.wsu.edu/',
  generateRobotsTxt: true,
  outDir: 'out',
}
