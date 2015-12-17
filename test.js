"use strict";

var event = {
    "Origin": "https://www.youtube.com/watch?v=0z9yS1-We6U",
    "Bucket": "video-qa-mzplus-com",
    "UserMetaData": {
        "miid": "E1337",
        "page": "101",
        "part": "11"
    }
};

var PullOrigin2S3 = require("./PullOrigin2S3");

PullOrigin2S3.pull(event, null);
