import fs from 'fs';
import ytpl from 'ytpl';

import downloadVideo from './downloader.js';
import { upload } from './dropbox.js';

const channels = {
    CYCLE_WORLD: {
        name: 'cycleworld',
        youtubeId: 'UCRYSnygAnAZApkVm-LwTOkg',
    },
    // add others channels
};

// get all videos of specific channel
async function downloadChannelVideos(channel) {
    const playlist = await ytpl(channel.youtubeId, { limit: 1 }); // just one to test

    const metadata = {
        author: playlist.author.name,
        channelId: playlist.author.channelID,
        totalItems: playlist.estimatedItemCount,
        items: playlist.items,
    };

    const item = metadata.items[0];

    // get title, description and index, save on DB
    // upload to daily motion and mark video as migrated
    console.log('Downloading:', item.title);
    downloadVideo(item.url, item.title);

    // check if video exist
    const pathVideoDownloaded = `./${item.title}.mkv`;
    console.log(pathVideoDownloaded);
    console.log(fs.existsSync(pathVideoDownloaded));
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

// start download of videos
downloadChannelVideos(channels.CYCLE_WORLD);
