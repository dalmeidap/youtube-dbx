import fs from 'fs';
import ytpl from 'ytpl';
import prompts from 'prompts';

import eventEmitter from './events.js';
import downloadVideo from './downloader.js';
import { initDropBoxClient, testConnection, upload } from './dropbox.js';
import CHANNELS from './channels.js';

// get all videos of specific channel
async function downloadChannelVideos(channel) {
    let indexItems = 0;
    const playlist = await ytpl(channel.youtubeId, { limit: 4 }); // just one to test

    const metadata = {
        author: playlist.author.name,
        channelId: playlist.author.channelID,
        totalItems: playlist.estimatedItemCount,
        items: playlist.items,
    };

    // when video is downloaded, upload to dropbox
    eventEmitter.on('downloaded', async (video) => {
        const { id, title } = video;
        const pathVideoDownloaded = `./${title}.mkv`;

        // upload to DropBox
        console.log(`\n${indexItems+1}/${metadata.items.length} Uploading...`);
        upload({
            title: title,
            channel: channel.name,
            file: pathVideoDownloaded,
            extension: 'mkv',
        });
    });

    // when video is uploaded to dropbox, delete it locally and mark as uploaded in DB
    eventEmitter.on('uploaded', (dropBoxPath, fileSize, videoData) => {
        console.info(`[${fileSize}] - Done: ${dropBoxPath}`);

        // delete video locally and mark as uploaded in DB
        fs.unlinkSync(videoData.file);

        // finish
        if (indexItems + 1 === metadata.items.length) {
            console.info('\n\n🎉 Migration finished.');
            process.exit(0); // finish process
        }

        indexItems++;
        const nextVideo = metadata.items[indexItems];
        console.log('\n- Downloading:', nextVideo.title);
        downloadVideo({
            index: nextVideo.index,
            id: nextVideo.id,
            url: nextVideo.url,
            title: nextVideo.title,
            channelId: nextVideo.channelId,
        });
    });

    const item = metadata.items[indexItems];
    console.log('\n- Downloading:', item.title);
    downloadVideo({
        index: item.index,
        id: item.id,
        url: item.url,
        title: item.title,
        channelId: metadata.channelId,
    });
}

(async () => {
    console.info(
        'To generate a Dropbox Access Token, go to Dropbox Developers (https://www.dropbox.com/developers)\n' +
            'My apps -> Youtube Migration -> Generate access token \n'
    );

    const response = await prompts([
        {
            type: 'text',
            name: 'accessToken',
            message: 'Dropbox - Access Token',
            validate: (value) => {
                const token = value.trim();
                if (token.trim() === '' || !token.startsWith('sl.')) {
                    return `You have to provide a valid access token`;
                }

                return true;
            },
            initial:
                'sl.BhBCgocli4VOP13whk7WGr4qkBnwenlOlYae_2DdZz5P58TjuX7LcNRTCnV-jeHPqKT3aemSSYRdWxvThTe8TaVfYZ5flMR53VYHkfRHNJflNW62AYvIa8O5x6O941jpIf_i0CPQc2N5',
        },
        {
            type: 'select',
            name: 'youtubeChannel',
            message: 'Youtube Channel',
            choices: Object.keys(CHANNELS).map((channelId) => {
                const channel = CHANNELS[channelId];
                return {
                    title: channel.label,
                    description: channel.label,
                    value: channel.id,
                };
            }),
            initial: 0,
        },
    ]);

    // init dropbox client with token provided
    const { accessToken, youtubeChannel } = response;
    initDropBoxClient(accessToken);

    // test connection with DropBox
    const isSuccess = await testConnection();
    if (!isSuccess) return;

    // start download videos from youtube channel
    downloadChannelVideos(CHANNELS[youtubeChannel]);
})();
