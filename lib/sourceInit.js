/**
 * User: ngnono
 * Date: 15-1-29
 * Time: 下午2:03
 * To change this template use File | Settings | File Templates.
 */

'use strict';

var fs = require('fs');
var _ = require('lodash');

var csv = require('csv');
var parse = csv.parse;

var tools = require('./utils');


function _readFile(opts, callback) {
    opts = opts || {};
    if (!callback) {
        throw new Error('callback is must');
    }

    if (!opts.fileFullName) {
        if (!opts.fileName) {
            throw new Error('fileFullName is null or fileName is null');
        }
    }

    var fileFullName = opts.fileFullName || __dirname + '/' + opts.fileName;
    //default csv
    //{delimiter: ',', columns: true}

    var parser = parse(opts.csv || {delimiter: ',', columns: true}, function (err, datas) {
        if (err) {
            return callback(err);
        } else {
            callback(null, datas);
        }
    });

    fs.createReadStream(fileFullName).pipe(parser);//.pipe(transformer);
}


exports.sourceInit = function (datas, opts) {

    opts = opts || {};
    var newDatas = [];

    var defaultDomain = opts.domain || '';
    var prefix4Img = opts.prefix.img || '';
    var preifx4Audio = opts.prefix.audio || '';
    var resize = opts.resize || {};
    var resizeExtname = opts.resizeExtname;

    _.forEach(datas, function (d) {

        //todo:这里 需要改一下 后缀名判断
        var prefix = d.extname === 'm4a' ? preifx4Audio : prefix4Img;
        var t = tools.getStringPrefix(d.fileName, '/');
        var r = resize[t];

        var fileInfo = {
            name: d.fileName, //+ d.extName,
            extname: d.extname,
            domain: defaultDomain,
            prefix: prefix,
            resizeExtname: resizeExtname,

            tranId: d.id,
            sourceId: d.sourceId,
            sourceType: d.sourceType
        };

        if (r) {
            fileInfo['resize'] = r;
        }

        newDatas.push(fileInfo);
    });

    return newDatas;
};

exports.readSourceFile = function (opts, callback) {
    _readFile(opts, callback);
};