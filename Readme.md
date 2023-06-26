# How to use this script

This script was created to migrate whole our catalog of 3000 videos hosted in 7 different channels in Youtube to DailyMotion.

DailyMotion API has some restrictions, like only allow upload by API 96 videos for each 24 hours. So the solution defined was upload whole videos organized by folders by each Youtube channel and then share the Dropbox folder with ytmigration@dailymotion.com.

Reference
[Migrate a Youtube catalog to Dailymotion](https://faq.dailymotion.com/hc/en-us/articles/360012870140-Migrate-a-Youtube-catalog-to-Dailymotion)

IMPORTANT: the option **Export your catalog from Google Takeout** was tested and it didn't work.

## Install dependencies

```bash
yarn
```

## Run migration

This script will download every video from the channel selected and upload to the Dropbox account associated with access token provided

Videos will be save in DropBox: `/youtube/{channelName}/` (without spaces and dashes)

```bash
node migration.js
```

## How to generate a DropBox Access Token

Go to [DropBox Developers](https://www.dropbox.com/developers/) => App Console, and select the application created before, go to Settings, scroll down and click on "Generate access token".

Those tokens just are valid for 24 hours.
