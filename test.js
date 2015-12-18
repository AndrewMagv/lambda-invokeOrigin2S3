"use strict";

var event = {
    "Origin": "https://www.youtube.com/watch?v=0z9yS1-We6U",
    "VidBucket": "video-qa-mzplus-com",
    "CoverBucket": "preview-candidate-mzplus-com",
    "UserMetaData": {
        "miid": "E1337",
        "page": "101",
        "part": "11",
        "channel": "1234567890"
    }
};

var PullOrigin2S3 = require("./PullOrigin2S3");

PullOrigin2S3.pull(event, null);
