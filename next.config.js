/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/trends',
        permanent: true,
      },
    ]
  }
};

module.exports = nextConfig
