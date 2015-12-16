"use strict";

var util = require("util");

var debug = util.debuglog('pull-ytdl');

var Promise = require("promise"),
    request = require("request"),
    ytdl = require("ytdl-core");

var aws = require("aws-sdk-promise")(),
    s3 = aws.S3(),
    PutObject = s3.PutObject;

function ytdlinfo(origin, opts) {
    function getytinfo(ok, grr) {
        ytdl.getInfo(origin, opts, function(err, info) {
            if (err) {
                grr(err);
            } else {
                ok(info);
            }
        });
    }
    return new Promise(getytinfo);
}

function get(url) {
    function _get(ok, grr) {
        request.get(url)
            .on("response", function(res) {
                debug("ytdl: get:", res.statusCode, res.headers);
                if (res.statusCode === 200) {
                    ok({body: res, contentLength: res.headers['content-length']});
                } else {
                    grr(res.statusCode);
                }
            })
            .on("error", function(e) {
                grr(e);
            });
    }
    return new Promise(_get);
}

exports.pull = function(event, context) {
    var origin = event.Origin,
        bucket = event.Bucket,
        udat = event.UserMetaData;

    ytdlinfo(origin)
        .then(function(info) {
            udat.src = info.title;
            debug("ytdl: title:", info.title);
            debug("ytdl: url:", info.formats[0].url);
            return get(info.formats[0].url);
        })
        .then(function(res) {
            debug("putObject: size:", res.contentLength);
            var putOpts = {
                Bucket: bucket,
                Key: udat.miid + ":" + udat.page + ":" + udat.part + "@" + udat.src,
                Body: res.body,
                ContentType: "x-mz-custom/video",
                ContentLength: res.contentLength,
                StorageClass: "REDUCED_REDUNDANCY"
            };
            return PutObject(putOpts);
        })
        .then(function() {
            debug("ok");
            context && context.success("ok");
        })
        .catch(function(err) {
            debug(err);
            context && context.fail(err);
        });
};
