const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: '127.0.0.1',
  port: 9000,
  useSSL: false,
  accessKey: 'admin',
  secretKey: 'password'
});

const BUCKET_NAME = 'videos';

// Ensure bucket exists
const initMinio = async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`MinIO Bucket '${BUCKET_NAME}' created.`);
    }
  } catch (error) {
    console.error('Error initializing MinIO bucket:', error);
  }
};

initMinio();

const uploadFileToMinio = async (fileName, filePath, contentType) => {
  try {
    const metaData = { 'Content-Type': contentType };
    await minioClient.fPutObject(BUCKET_NAME, fileName, filePath, metaData);
    return fileName;
  } catch (error) {
    console.error('Error uploading file to MinIO:', error);
    throw error;
  }
};

const getPresignedUrl = async (fileName) => {
  try {
    // Extract filename if a path was accidentally stored
    const name = fileName.replace(/\\/g, '/').split('/').pop();
    return await minioClient.presignedGetObject(BUCKET_NAME, name, 24 * 60 * 60);
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return null;
  }
};

const deleteFileFromMinio = async (fileName) => {
  try {
    const name = fileName.replace(/\\/g, '/').split('/').pop();
    await minioClient.removeObject(BUCKET_NAME, name);
  } catch (error) {
    console.error('Error deleting file from MinIO:', error);
  }
};

const downloadFileFromMinio = async (fileName, localFilePath) => {
  try {
    const name = fileName.replace(/\\/g, '/').split('/').pop();
    await minioClient.fGetObject(BUCKET_NAME, name, localFilePath);
    return localFilePath;
  } catch (error) {
    console.error('Error downloading file from MinIO:', error);
    throw error;
  }
};

module.exports = {
  uploadFileToMinio,
  getPresignedUrl,
  deleteFileFromMinio,
  downloadFileFromMinio,
  BUCKET_NAME
};
