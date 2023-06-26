import axios from 'axios';
import formData from 'form-data';
import fs from 'fs';

// generate access token on DailyMotion Developer Tools
// https://developers.dailymotion.com/tools/
const ACCESS_TOKEN = 'eWRGVVAAEUB1FCMzSDpAKxE9Cnt4YUA-BQ9WVBUGLR8S';
const BASE_URL = 'https://api.dailymotion.com';

export const uploadVideo = async (filePath, channelId, metadata) => {
    console.log(metadata, channelId);
    const { title } = metadata;
    // get upload_url to submit the video
    const { upload_url, progress_url } = await getUploadUrls();

    // upload file
    const video = await sendFile(filePath, upload_url);
    console.log('videoUrl', video.url);

    // create video
    const videoId = await createVideo({
        url: video.url,
        channelId,
    });
    console.log('videoId', videoId);

    // Publish video
    // const result = await publishVideo({
    //     title,
    //     videoId,
    // });

    // console.log('publish video: ', result);
};

const getUploadUrls = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/file/upload`, {
            headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
            },
        });

        // console.log(response)
        return response.data;
    } catch (e) {
        console.error(`Error [ getUploadUrl ] -> ${e}`);
    }
};

const sendFile = async (filePath, uploadUrl) => {
    try {
        // Open file as a readable stream
        const fileStream = fs.createReadStream(filePath);

        const form = new formData();
        // Pass file stream directly to form
        form.append('file', fileStream, 'video.mp4');

        const response = await axios.post(uploadUrl, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${ACCESS_TOKEN}`, // optional
            },
            maxContentLength: 100000000,
            maxBodyLength: 1000000000,
        });

        return response.data;
    } catch (e) {
        console.error(`Error [ SendFile ] -> ${e}`);
    }
};

const createVideo = async ({ url, channelId }) => {
    let data = new FormData();
    data.append('url', url);

    try {
        const response = await axios.request({
            data,
            url: `${BASE_URL}/user/${channelId}/videos`,
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${ACCESS_TOKEN}`,
            },
            maxBodyLength: Infinity,
        });

        console.log(response.data);
        return response.data;
    } catch (e) {
        console.error(`Error [ CreateVideo ] -> ${e}`);
    }
};

const publishVideo = async ({ title, videoId }) => {
    let data = new FormData();
    data.append('title', title);
    data.append('channel', 'auto');
    data.append('published', 'true');
    data.append('is_created_for_kids', 'false');

    try {
        const response = await axios.request({
            data,
            url: `${BASE_URL}/video/${videoId}`,
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${ACCESS_TOKEN}`,
            },
            maxBodyLength: Infinity,
        });

        return response.data;
    } catch (e) {
        console.error(`Error [ PublishVideo ] -> ${e}`);
    }
};
