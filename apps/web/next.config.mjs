/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/ws",
        destination: "http://127.0.0.1:3001/ws",
      },
    ]
  },
}

export default nextConfig
