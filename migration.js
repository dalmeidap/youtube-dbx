import fs from 'fs';
import ytpl from 'ytpl';
import prompts from 'prompts';

import downloadVideo from './downloader.js';
import { initDropBoxClient, upload } from './dropbox.js';
import CHANNELS from './channels.js';

// get all videos of specific channel
async function downloadChannelVideos(channel) {
    const playlist = await ytpl(channel.youtubeId, { limit: 2 }); // just one to test

    const metadata = {
        author: playlist.author.name,
        channelId: playlist.author.channelID,
        totalItems: playlist.estimatedItemCount,
        items: playlist.items,
    };

    const item = metadata.items[1];

    // get title, description and index, save on DB
    // upload to daily motion and mark video as migrated
    console.log('\n- Downloading:', item.title);
    downloadVideo(item.url, item.title);

    // check if video exist
    const pathVideoDownloaded = `./${item.title}.mkv`;
    if (fs.existsSync(pathVideoDownloaded)) {
        // upload to DropBox
        const isSuccess = await upload({
            title: item.title,
            channel: channel.name,
            file: pathVideoDownloaded,
            extension: 'mkv',
        });

        // delete video locally and mark as uploaded in DB
        if (isSuccess) {
            fs.unlinkSync(pathVideoDownloaded);
        }
    }
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

    // start download videos from youtube channel
    downloadChannelVideos(CHANNELS[youtubeChannel]);
})();
