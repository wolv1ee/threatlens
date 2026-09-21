/** @type {import('next').NextConfig} */
const nextConfig = {
  // The YARA rule files are read from disk at request time (fs.readdirSync),
  // which Next's file tracer can't discover statically - so the serverless
  // bundle for the file-scan route needs an explicit include or the /rules
  // directory won't ship to Vercel.
  outputFileTracingIncludes: {
    '/api/scan-file/route': ['./rules/**/*'],
  },
}

module.exports = nextConfig
