import { Client, Storage, ID } from 'node-appwrite';
import dotenv from 'dotenv';
const { InputFile } = require('node-appwrite/file');

dotenv.config();
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_BUCKET_ID) {
    throw new Error('Missing required Appwrite environment variables');
}

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const storage = new Storage(client);

interface AppwriteUpload {
    saveFile(base64String: string): Promise<string>;
    deleteFile(fileUrl: string): Promise<void>;
}

const appwriteUpload: AppwriteUpload = {
    async saveFile(base64String: string): Promise<string> {
        let fileUrl: string = '';
        try {
            if (!base64String || typeof base64String !== 'string') {
                throw new Error('Invalid input: base64String is required and must be a string');
            }
            const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                throw new Error('Invalid base64 string format');
            }

            const fileType = matches[1];
            const base64Data = matches[2];
            
            if (!fileType.startsWith('image/') && fileType !== 'application/pdf') {
                throw new Error('Invalid file type: must be an image or PDF');
            }

            const extension = fileType === 'application/pdf' ? 'pdf' : fileType.split('/')[1];
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

            const buffer = Buffer.from(base64Data, 'base64');
            const maxSize = 10 * 1024 * 1024;
            if (buffer.length > maxSize) {
                throw new Error(`File size exceeds maximum limit of ${maxSize} bytes`);
            }

            const file = InputFile.fromBuffer(buffer, fileName);
            const uniqueId = ID.unique();
            const result = await storage.createFile(
                APPWRITE_BUCKET_ID,
                uniqueId,
                file
            );
            fileUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${result.$id}/view?project=${APPWRITE_PROJECT_ID}`;
            return fileUrl;

        } catch (error) {
            console.error('❌ Upload error:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                name: error instanceof Error ? error.name : 'Unknown',
                code: error instanceof Error ? (error as any).code : undefined,
                stack: error instanceof Error ? error.stack : undefined,
                attemptedFileUrl: fileUrl
            });
            const envCheck = {
                hasEndpoint: !!APPWRITE_ENDPOINT,
                hasProjectId: !!APPWRITE_PROJECT_ID,
                hasApiKey: !!APPWRITE_API_KEY,
                hasBucketId: !!APPWRITE_BUCKET_ID
            };

            if (!Object.values(envCheck).every(Boolean)) {
                console.error('Missing required environment variables:',
                    Object.entries(envCheck)
                        .filter(([, value]) => !value)
                        .map(([key]) => key)
                );
            }

            throw error;
        }
    },

    async deleteFile(fileUrl: string): Promise<void> {
        if (!fileUrl) {
            console.log('⚠️ No file URL provided for deletion');
            return;
        }

        try {
            const urlParts = fileUrl.split('/files/');
            if (urlParts.length !== 2) {
                throw new Error('Invalid file URL format');
            }

            const fileId = urlParts[1].split('/view')[0];
            if (!fileId) {
                throw new Error('Could not extract file ID from URL');
            }

            await storage.deleteFile(
                APPWRITE_BUCKET_ID,
                fileId
            );
        } catch (error) {
            console.error('❌ Delete error:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                name: error instanceof Error ? error.name : 'Unknown',
                code: error instanceof Error ? (error as any).code : undefined,
                stack: error instanceof Error ? error.stack : undefined,
                fileUrl
            });
            throw error;
        }
    }
};

export default appwriteUpload; 