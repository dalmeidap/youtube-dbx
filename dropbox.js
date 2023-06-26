import fs from 'fs';
import { Dropbox } from 'dropbox';
import eventEmitter from './events.js';

const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024;

let dropBox;
export const initDropBoxClient = (accessToken) => {
    dropBox = new Dropbox({ accessToken: accessToken });
};

const getFileSize = (fileSize) => {
    const fSExt = ['Bytes', 'KB', 'MB', 'GB'];
    let fSize = fileSize;
    let i = 0;
    while (fSize > 900) {
        fSize /= 1024;
        i++;
    }

    return Math.round(fSize * 100) / 100 + ' ' + fSExt[i];
};

export const upload = async ({ channel, file, title, extension }) => {
    const contents = fs.readFileSync(file);
    const fileSize = Buffer.byteLength(contents);
    const filePath = `/youtube/${channel}/${title}.${extension}`;
    const fileSizeStr = getFileSize(fileSize);

    let dropBoxPath;
    if (fileSize < UPLOAD_FILE_SIZE_LIMIT) {
        // File is smaller than 150 MB - use filesUpload API
        dropBoxPath = await uploadFile(filePath, contents, fileSizeStr);
    } else {
        dropBoxPath = await uploadFileChunks(filePath, contents, fileSizeStr);
    }
};

// for files smaller than 150 MB
const uploadFile = async (path, contents, fileSizeStr) => {
    try {
        const resultUpload = await dropBox.filesUpload({
            path,
            contents,
        });

        eventEmitter.emit(
            'uploaded',
            resultUpload.result.path_display,
            fileSizeStr
        );
    } catch (e) {
        console.error(`Dropbox [uploadFile] -> ${e}`);
    }
};

// for files bigger than 150 MB
const uploadFileChunks = async (path, contents, fileSizeStr) => {
    const fileSize = Buffer.byteLength(contents);
    // 8MB - Dropbox JavaScript API suggested chunk size
    const maxBlob = 12 * 1024 * 1024;
    const workItems = [];
    let offset = 0;

    while (offset < fileSize) {
        const chunkSize = Math.min(maxBlob, fileSize - offset);
        workItems.push(contents.slice(offset, offset + chunkSize));
        offset += chunkSize;
    }

    const task = workItems.reduce((acc, blob, idx, items) => {
        if (idx == 0) {
            // Starting multipart upload of file
            return acc.then(function () {
                return dropBox
                    .filesUploadSessionStart({ close: false, contents: blob })
                    .then((response) => response.result.session_id);
            });
        } else if (idx < items.length - 1) {
            // Append part to the upload session
            return acc.then(function (sessionId) {
                const cursor = { session_id: sessionId, offset: idx * maxBlob };
                return dropBox
                    .filesUploadSessionAppendV2({
                        cursor: cursor,
                        close: false,
                        contents: blob,
                    })
                    .then(() => sessionId);
            });
        } else {
            // Last chunk of data, close session
            return acc.then(function (sessionId) {
                const cursor = {
                    session_id: sessionId,
                    offset: fileSize - Buffer.byteLength(blob),
                };
                const commit = {
                    path,
                    mode: 'add',
                    autorename: true,
                    mute: false,
                };
                console.log(cursor, commit);
                return dropBox.filesUploadSessionFinish({
                    cursor: cursor,
                    commit: commit,
                    contents: blob,
                });
            });
        }
    }, Promise.resolve());

    task.then(function (response) {
        eventEmitter.emit(
            'uploaded',
            response.result.path_display,
            fileSizeStr
        );
    }).catch(function (e) {
        console.error(`Dropbox [uploadFileChunks] -> ${e}`);
    });
};
