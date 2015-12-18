"use strict";

var crypto = require("crypto"),
    https = require("https"),
    moment = require("moment"),
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

function sha1(data) {
    return crypto.createHash("sha1").update(data).digest("hex");
}

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
        vidBucket = event.VidBucket,
        covBucket = event.CoverBucket,
        udat = event.UserMetaData;

    ytdlinfo(origin)
        .then(function(info) {
            udat.src = info.title;
            debug("ytdl: title:", info.title);
            debug("ytdl: cover:", info.thumbnail_url);
            debug("ytdl: output:", JSON.stringify(info.formats.filter(function(fmt) {
                return fmt.quality !== undefined;
            })
            .map(function(fmt) {
                return [fmt.quality, fmt.itag, fmt.type];
            }), null, 4));
            debug("ytdl: url:", info.formats[0].url);

            return Promise.all([get(info.formats[0].url), get(info.thumbnail_url)]);
        })
        .then(function(resources) {
            debug("putObject: size:", resources.map(function(res) { return res.size; }));
            var putVidOpts = {
                Bucket: vidBucket,
                Key: udat.miid + ":" + udat.page + ":" + udat.part + "@" + udat.src,
                Body: resources[0].body,
                ContentType: "x-mz-custom/video",
                ContentLength: resources[0].size,
                StorageClass: "REDUCED_REDUNDANCY"
            };
            var putCoverOpts = {
                Bucket: covBucket,
                Key: udat.miid + ":" + udat.page + ":" + udat.part + "@" + sha1(moment().toJSON()) + "@" + udat.channel,
                Body: resources[1].body,
                ContentType: "x-mz-custom/image",
                ContentLength: resources[1].size,
                StorageClass: "REDUCED_REDUNDANCY"
            };
            return Promise.all([PutObject(putVidOpts), PutObject(putCoverOpts)]);
        })
        .then(function() {
            debug("ok");
            context && context.succeed("ok");
        })
        .catch(function(err) {
            debug(err);
            context && context.fail(err);
        });
};
