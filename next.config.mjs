/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    domains: ['lh3.googleusercontent.com', 'res.cloudinary.com'], // Add Cloudinary domain here
  },
};

export default nextConfig;
