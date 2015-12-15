"use strict";

var _ = require("lodash"),
    ytdl = require('ytdl-core');

var aws = require("aws-sdk-promise")(),
    s3 = aws.S3(),
    PutObject = s3.PutObject;

exports.pull = function(event, context) {
    var origin = event.Origin,
        bucket = event.Bucket,
        udat = event.UserMetaData;

    var putOpts = {
            Bucket: bucket,
            Key: udat.miid + ":" + udat.page + ":" + udat.part + "@" + udat.src,
            ContentType: "x-mz-custom/video",
            StorageClass: "REDUCED_REDUNDANCY"
        };

    PutObject(_.assign(putOpts, {Body: ytdl(origin)})).then(function() {
        context && context.success();
    })
    .catch(function(err) {
        context && context.fail(err);
    });
};
