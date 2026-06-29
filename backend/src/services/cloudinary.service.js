const cloudinary = require('../config/cloudinary')

function uploadToCloudinary(buffer, folder, options = {}) {
  return new Promise((resolve, reject) => {
    const { resource_type = 'auto', ...rest } = options
    const opts = { folder, resource_type, ...rest }
    const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
      if (err) return reject(err)
      resolve(result?.secure_url)
    })
    stream.end(buffer)
  })
}

module.exports = { uploadToCloudinary }
