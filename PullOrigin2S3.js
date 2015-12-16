"use strict";

var https = require("https"),
    util = require("util");

var debug = console.log;
if (util.debuglog !== undefined) {
    debug = util.debuglog('pull-ytdl');
}

var Promise = require("promise"),
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
        https.get(url, function(res) {
            var status = res.statusCode;
            if (status === 200) {
                ok({body: res, size: res.headers["content-length"]});
            } else if (status === 302 || status === 301) {
                ok(get(res.headers.location));
            } else {
                grr("failed to get resource");
            }
        }).on("error", function(e) {
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
            debug("putObject: size:", res.size);
            var putOpts = {
                Bucket: bucket,
                Key: udat.miid + ":" + udat.page + ":" + udat.part + "@" + udat.src,
                Body: res.body,
                ContentType: "x-mz-custom/video",
                ContentLength: res.size,
                StorageClass: "REDUCED_REDUNDANCY"
            };
            return PutObject(putOpts, {debug: true});
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
